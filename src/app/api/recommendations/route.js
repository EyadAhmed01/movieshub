import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchMovieSimilarAndRecommended,
  fetchTvSimilarAndRecommended,
  tmdbConfigured,
} from "@/lib/tmdb";

export async function GET() {
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

  /** Drop recs that match library rows without TMDB id (same title, and year when available). */
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

  const ratedMovies = movies
    .filter((m) => m.tmdbId && m.userRating != null)
    .sort((a, b) => b.userRating - a.userRating)
    .slice(0, 6);

  const ratedSeries = series
    .filter((s) => s.tmdbId && s.userRating != null)
    .sort((a, b) => b.userRating - a.userRating)
    .slice(0, 4);

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
    const { similar, recommended } = await fetchMovieSimilarAndRecommended(m.tmdbId);
    for (const x of similar) bump(x, w * 1);
    for (const x of recommended) bump(x, w * 1.6);
  }

  for (const s of ratedSeries) {
    const w = 0.5 + s.userRating / 20;
    const { similar, recommended } = await fetchTvSimilarAndRecommended(s.tmdbId);
    for (const x of similar) bump(x, w * 1);
    for (const x of recommended) bump(x, w * 1.6);
  }

  const list = [...scored.values()].map(({ score, item }) => ({ ...item, _score: score }));
  list.sort((a, b) => b._score - a._score);
  const stripScore = ({ _score, ...rest }) => rest;
  const movieItems = list
    .filter((x) => x.mediaType === "movie" && !recIsExcluded(x))
    .map(stripScore)
    .slice(0, 12);
  const tvItems = list
    .filter((x) => x.mediaType === "tv" && !recIsExcluded(x))
    .map(stripScore)
    .slice(0, 12);

  const algorithm = {
    name: "TMDB graph blend (rule-based, not a trained ML model)",
    summary:
      "We take your highest-rated TMDB-linked movies and series, ask TMDB for similar and recommended titles for each, merge and dedupe, remove anything already in your library or on your watchlist (by TMDB id), plus manual library entries that match the same title (and year for movies), then rank by a simple score (recommendations count slightly more than similar; higher your rating on a seed title, the more weight its suggestions get). Movies and series are returned as separate lists.",
    mlNote:
      "This is collaborative filtering–adjacent metadata from TMDB, not a neural recommender. For a “real” ML model you’d typically learn embeddings from many users (matrix factorization, two-tower models) or fine-tune on click/rating logs; that needs a dataset + training pipeline beyond this stack.",
    steps: [
      "Pick up to 6 rated movies and 4 rated series (by your score).",
      "For each seed, fetch TMDB /similar and /recommendations (movies and TV use separate endpoints).",
      "Weight contributions by your rating on that seed.",
      "Drop titles already in your library or on your watchlist (TMDB id), and manual library rows that match the same title (and year for movies).",
      "Sort by combined score, then take the top movies and top series separately (up to 12 each).",
    ],
  };

  return NextResponse.json({ movieItems, tvItems, algorithm });
}
