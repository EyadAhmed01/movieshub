import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchMovieSimilarAndRecommended,
  fetchTvSimilarAndRecommended,
  tmdbConfigured,
} from "@/lib/tmdb";
import { llmConfigured, reorderForYouIndices } from "@/lib/llm";
import { buildUserSide, buildFeatureVector } from "@/lib/recFeatures";
import { loadRankerModel, rankerProbability } from "@/lib/recRanker";

export const dynamic = "force-dynamic";

const ENABLE_REC_IMPRESSIONS = process.env.REC_IMPRESSIONS !== "0";

function hashStringToUint32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function mul() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seedUint) {
  const rnd = mulberry32(seedUint);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!tmdbConfigured()) {
    return NextResponse.json({
      items: [],
      reason: "TMDB_API_KEY not configured",
    });
  }

  const { searchParams } = new URL(request.url);
  const seedStr = searchParams.get("_") || `${Date.now()}-${Math.random()}`;
  const seedUint = hashStringToUint32(seedStr);
  const tmdbPage = 1 + (seedUint % 5);
  const tmdbOpts = { page: tmdbPage, noStore: true };

  const [movies, series, watchlistRows] = await Promise.all([
    prisma.movieEntry.findMany({ where: { userId: session.user.id } }),
    prisma.seriesEntry.findMany({ where: { userId: session.user.id } }),
    prisma.watchlistItem.findMany({ where: { userId: session.user.id } }),
  ]);

  const owned = new Set();
  for (const m of movies) {
    if (m.tmdbId) owned.add(`movie:${m.tmdbId}`);
  }
  for (const s of series) {
    if (s.tmdbId) owned.add(`tv:${s.tmdbId}`);
  }
  for (const w of watchlistRows) {
    owned.add(`${w.mediaType}:${w.tmdbId}`);
  }

  function normTitle(t) {
    return String(t || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function matchesLibraryMovie(item) {
    const nt = normTitle(item.title);
    const y = item.year;
    return movies.some((m) => {
      if (m.tmdbId) return false;
      if (normTitle(m.title) !== nt) return false;
      if (y != null && Number.isFinite(y) && m.year !== y) return false;
      return true;
    });
  }

  function matchesLibrarySeries(item) {
    const nt = normTitle(item.title);
    return series.some((s) => {
      if (s.tmdbId) return false;
      return normTitle(s.title) === nt;
    });
  }

  function recIsExcluded(item) {
    const key = `${item.mediaType}:${item.tmdbId}`;
    if (owned.has(key)) return true;
    if (item.mediaType === "movie" && matchesLibraryMovie(item)) return true;
    if (item.mediaType === "tv" && matchesLibrarySeries(item)) return true;
    return false;
  }

  const allRatedMovies = movies
    .filter((m) => m.tmdbId && m.userRating != null)
    .sort((a, b) => b.userRating - a.userRating);
  const poolMovies = allRatedMovies.slice(0, Math.min(24, allRatedMovies.length));
  const ratedMovies =
    poolMovies.length <= 6
      ? seededShuffle([...poolMovies], seedUint ^ 0x9e3779b9)
      : seededShuffle(poolMovies, seedUint ^ 0x9e3779b9).slice(0, 6);

  const allRatedSeries = series
    .filter((s) => s.tmdbId && s.userRating != null)
    .sort((a, b) => b.userRating - a.userRating);
  const poolSeries = allRatedSeries.slice(0, Math.min(16, allRatedSeries.length));
  const ratedSeries =
    poolSeries.length <= 4
      ? seededShuffle([...poolSeries], seedUint ^ 0x85ebca6b)
      : seededShuffle(poolSeries, seedUint ^ 0x85ebca6b).slice(0, 4);

  if (ratedMovies.length === 0 && ratedSeries.length === 0) {
    return NextResponse.json({
      items: [],
      reason: "Rate a few titles (with TMDB linked) to get recommendations.",
    });
  }

  /** @type {Map<string, { score: number, item: object }>} */
  const scored = new Map();

  function bump(item, delta) {
    const key = `${item.mediaType}:${item.tmdbId}`;
    if (owned.has(key)) return;
    const prev = scored.get(key);
    if (prev) {
      prev.score += delta;
      return;
    }
    scored.set(key, { score: delta, item: { ...item } });
  }

  for (const m of ratedMovies) {
    const w = 0.5 + m.userRating / 20;
    const { similar, recommended } = await fetchMovieSimilarAndRecommended(m.tmdbId, tmdbOpts);
    for (const x of similar) bump(x, w * 1);
    for (const x of recommended) bump(x, w * 1.6);
  }

  for (const s of ratedSeries) {
    const w = 0.5 + s.userRating / 20;
    const { similar, recommended } = await fetchTvSimilarAndRecommended(s.tmdbId, tmdbOpts);
    for (const x of similar) bump(x, w * 1);
    for (const x of recommended) bump(x, w * 1.6);
  }

  const list = [...scored.values()].map(({ score, item }) => ({ ...item, _score: score }));
  const stripScore = ({ _score, genreIds: _g, ...rest }) => rest;

  const movieRich = list
    .filter((x) => x.mediaType === "movie" && !recIsExcluded(x))
    .sort((a, b) => b._score - a._score);
  const tvRich = list
    .filter((x) => x.mediaType === "tv" && !recIsExcluded(x))
    .sort((a, b) => b._score - a._score);

  const userSide = buildUserSide(movies, series);
  const rankerModel = loadRankerModel();

  async function finalizeStrip(rich, salt, rowKind) {
    if (rich.length === 0) return { items: [], logRows: [], usedLlm: false };
    const pool = seededShuffle(rich.slice(0, Math.min(48, rich.length)), seedUint ^ salt);
    const cap = Math.min(24, pool.length);
    let basePool = pool.slice(0, cap);
    const need = Math.min(12, basePool.length);
    if (need < 1) return { items: [], logRows: [], usedLlm: false };

    if (rankerModel) {
      const indexed = basePool.map((item, idx) => ({ item, idx }));
      indexed.sort((A, B) => {
        const fa = buildFeatureVector(userSide, A.item, {
          position: A.idx,
          rowKind,
          tmdbBlendScore: A.item._score,
        });
        const fb = buildFeatureVector(userSide, B.item, {
          position: B.idx,
          rowKind,
          tmdbBlendScore: B.item._score,
        });
        const pa = rankerProbability(fa, rankerModel);
        const pb = rankerProbability(fb, rankerModel);
        if (pb !== pa) return pb - pa;
        return B.item._score - A.item._score;
      });
      basePool = indexed.map((x) => x.item);
    }

    let usedLlm = false;
    let finalRaw = basePool.slice(0, need);

    if (llmConfigured() && basePool.length >= 12) {
      const lines = basePool.map((x, i) => `${i}. ${x.title} (${x.year ?? "?"})`).join("\n");
      const order = await reorderForYouIndices(basePool.length, lines, 12);
      if (order) {
        usedLlm = true;
        finalRaw = order.map((i) => basePool[i]).filter(Boolean).slice(0, need);
      }
    }

    const logRows = finalRaw.map((item, position) => ({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      rowKind,
      position,
      features: buildFeatureVector(userSide, item, {
        position,
        rowKind,
        tmdbBlendScore: item._score,
      }),
      tmdbBlendScore: item._score,
    }));

    const items = finalRaw.map(stripScore);
    return { items, logRows, usedLlm };
  }

  const moviePack = await finalizeStrip(movieRich, 0x11111111, "movie");
  const tvPack = await finalizeStrip(tvRich, 0x22222222, "tv");
  let movieItems = moviePack.items;
  let tvItems = tvPack.items;
  const usedLlmMix = moviePack.usedLlm || tvPack.usedLlm;

  async function attachImpressionIds(rows, items) {
    if (!ENABLE_REC_IMPRESSIONS || rows.length === 0) return items;
    const uid = session.user.id;
    try {
      const created = await prisma.$transaction(
        rows.map((row) =>
          prisma.recImpression.create({
            data: {
              userId: uid,
              tmdbId: row.tmdbId,
              mediaType: row.mediaType,
              rowKind: row.rowKind,
              position: row.position,
              features: row.features,
              tmdbBlendScore: row.tmdbBlendScore,
            },
            select: { id: true },
          })
        )
      );
      return items.map((it, i) => ({ ...it, recImpId: created[i]?.id }));
    } catch (e) {
      console.error("rec impressions:", e);
      return items;
    }
  }

  movieItems = await attachImpressionIds(moviePack.logRows, movieItems);
  tvItems = await attachImpressionIds(tvPack.logRows, tvItems);

  const algorithm = {
    name: "TMDB graph blend + fresh refresh",
    summary:
      "Each refresh uses a new random seed: we rotate which highly-rated titles seed TMDB similar/recommendations, which TMDB result page (1–5) we pull, and we shuffle among strong candidates so lists change. With GROQ_API_KEY or Ollama configured, Mr Potato (Llama) may reorder up to 12 picks per row for extra variety.",
    mlNote: usedLlmMix
      ? "This response used your LLM (Groq or Ollama) to reorder candidates for variety."
      : "Configure GROQ_API_KEY or LLM_PROVIDER=ollama so Mr Potato can reorder picks on each refresh; without that, variety comes from seed shuffle + TMDB page rotation only.",
    steps: [
      "Pick rated seeds from a shuffled pool (not always the same top 6 movies / 4 series).",
      `Fetch TMDB similar + recommendations at page ${tmdbPage} (1–5) per seed, without CDN cache, so pages can differ each refresh.`,
      "Weight and merge scores; exclude library, watchlist, and manual title matches.",
      rankerModel
        ? "Candidates are reranked with a trained logistic model (data/ranker_weights.json) before optional LLM shuffle; impressions are logged for retraining."
        : "Shuffle among the top ~48 scored titles, then take up to 12 (optionally reordered by Mr Potato when the LLM is configured). Train a ranker: npm run rec:export && npm run rec:train.",
    ],
  };

  if (rankerModel) {
    algorithm.name = "TMDB blend + personalized ranker + refresh";
    algorithm.mlNote = `${algorithm.mlNote} Personalized logistic ranker active (${rankerModel.nSamples ?? "?"} training rows).`;
  }

  return NextResponse.json({ movieItems, tvItems, algorithm });
}
