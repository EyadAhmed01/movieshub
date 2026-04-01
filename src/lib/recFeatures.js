/**
 * Fixed feature layout for rec impression logging + `scripts/train-ranker.mjs`.
 * Keep in sync with training export columns feature0..featureN.
 */
export const REC_FEATURE_NAMES = [
  "bias",
  "user_avg_rating_norm",
  "user_rated_count_norm",
  "genre_match",
  "vote_average_norm",
  "year_norm",
  "is_tv",
  "position_norm",
  "tmdb_blend_norm",
];

export const REC_FEATURE_DIM = REC_FEATURE_NAMES.length;

/** TMDB genre ids (movies; TV uses the same numeric ids in list endpoints). */
export const REC_GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
];

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function genreIdsFromItem(item) {
  const g = item?.genreIds;
  if (!Array.isArray(g)) return [];
  return g.map((id) => Number(id)).filter((n) => Number.isFinite(n));
}

/**
 * Per-genre average user rating (1–5) among rated library entries that list the genre; else null.
 */
function userGenreAvgRatings(movies, series) {
  const sum = new Map();
  const cnt = new Map();
  for (const id of REC_GENRE_IDS) {
    sum.set(id, 0);
    cnt.set(id, 0);
  }
  for (const m of movies) {
    const r = m.userRating;
    if (r == null || r <= 0) continue;
    const genres = Array.isArray(m.genres) ? m.genres : [];
    const ids = new Set();
    for (const name of genres) {
      const found = REC_GENRE_IDS.find((gid) => genreNameToId(name) === gid);
      if (found != null) ids.add(found);
    }
    for (const gid of ids) {
      sum.set(gid, sum.get(gid) + r);
      cnt.set(gid, cnt.get(gid) + 1);
    }
  }
  for (const s of series) {
    const r = s.userRating;
    if (r == null || r <= 0) continue;
    const genres = Array.isArray(s.genres) ? s.genres : [];
    const ids = new Set();
    for (const name of genres) {
      const found = REC_GENRE_IDS.find((gid) => genreNameToId(name) === gid);
      if (found != null) ids.add(found);
    }
    for (const gid of ids) {
      sum.set(gid, sum.get(gid) + r);
      cnt.set(gid, cnt.get(gid) + 1);
    }
  }
  const out = new Map();
  for (const id of REC_GENRE_IDS) {
    const c = cnt.get(id);
    if (c > 0) out.set(id, sum.get(id) / c);
  }
  return out;
}

/** Rough name→id when library stores genre names from TMDB. */
function genreNameToId(name) {
  const n = String(name || "")
    .toLowerCase()
    .trim();
  const table = {
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    music: 10402,
    mystery: 9648,
    romance: 10749,
    "science fiction": 878,
    sciencefiction: 878,
    "sci-fi": 878,
    scifi: 878,
    "tv movie": 10770,
    thriller: 53,
    war: 10752,
    western: 37,
  };
  return table[n] ?? null;
}

/**
 * @param {import("@prisma/client").MovieEntry[]} movies
 * @param {import("@prisma/client").SeriesEntry[]} series
 */
export function buildUserSide(movies, series) {
  const ratedM = movies.filter((m) => m.userRating != null && m.userRating > 0);
  const ratedS = series.filter((s) => s.userRating != null && s.userRating > 0);
  const all = [...ratedM, ...ratedS];
  const count = all.length;
  let avg = 0;
  if (count > 0) {
    avg = all.reduce((a, x) => a + x.userRating, 0) / count;
  }
  return {
    avgRating: avg,
    ratedCount: count,
    genreAvg: userGenreAvgRatings(movies, series),
  };
}

/**
 * genre_match: average of (user avg rating for genre)/5 over item genres, or 0.5 if unknown.
 */
export function genreMatchScore(userSide, item) {
  const ids = genreIdsFromItem(item);
  if (ids.length === 0) return 0.5;
  let s = 0;
  let n = 0;
  for (const gid of ids) {
    const ar = userSide.genreAvg.get(gid);
    s += ar != null ? ar / 5 : 0.5;
    n += 1;
  }
  return n > 0 ? s / n : 0.5;
}

/**
 * @param {ReturnType<typeof buildUserSide>} userSide
 * @param {object} item — TMDB-shaped (mediaType, voteAverage, year, genreIds)
 * @param {{ position: number, rowKind: string, tmdbBlendScore: number }} ctx
 * @returns {number[]}
 */
export function buildFeatureVector(userSide, item, ctx) {
  const userAvgNorm = userSide.ratedCount > 0 ? userSide.avgRating / 5 : 0.5;
  const countNorm = clamp(userSide.ratedCount / 30, 0, 1);
  const gMatch = genreMatchScore(userSide, item);
  const va = item.voteAverage;
  const voteNorm = typeof va === "number" && Number.isFinite(va) ? clamp(va / 10, 0, 1) : 0.5;
  const y = item.year;
  const yearNorm =
    typeof y === "number" && Number.isFinite(y) ? clamp((y - 1990) / 40, 0, 1) : 0.5;
  const isTv = item.mediaType === "tv" ? 1 : 0;
  const posNorm = clamp(ctx.position / 15, 0, 1);
  const blend = ctx.tmdbBlendScore;
  const blendNorm =
    typeof blend === "number" && Number.isFinite(blend) ? clamp(Math.log1p(Math.max(0, blend)) / 4, 0, 1) : 0.25;

  return [1, userAvgNorm, countNorm, gMatch, voteNorm, yearNorm, isTv, posNorm, blendNorm];
}

export { genreIdsFromItem };
