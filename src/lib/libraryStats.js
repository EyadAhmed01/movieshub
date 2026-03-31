/**
 * @param {{ runtimeMinutes?: number | null }[]} movies
 * @param {{ episodeRuntimeMinutes?: number | null, eps?: number | null }[]} series
 */
export function computeWatchMinutes(movies, series) {
  let movieMinutes = 0;
  for (const m of movies || []) {
    const r = m.runtimeMinutes;
    if (typeof r === "number" && r > 0) movieMinutes += r;
  }
  let seriesMinutes = 0;
  for (const s of series || []) {
    const ep = s.episodeRuntimeMinutes;
    const eps = s.eps;
    if (typeof ep === "number" && ep > 0 && typeof eps === "number" && eps > 0) {
      seriesMinutes += ep * eps;
    }
  }
  return { movieMinutes, seriesMinutes, totalMinutes: movieMinutes + seriesMinutes };
}

function decadeFromYear(y) {
  if (y == null || !Number.isFinite(y)) return null;
  const n = Math.floor(Number(y));
  if (n < 1880 || n > 2100) return null;
  const d = Math.floor(n / 10) * 10;
  return `${d}s`;
}

/** @param {string | null | undefined} years e.g. "2019-2022" or "2019" */
function startYearFromSeriesYears(years) {
  if (!years || typeof years !== "string") return null;
  const m = years.trim().match(/^(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

function genreNamesFromJson(genres) {
  if (!genres || !Array.isArray(genres)) return [];
  const out = [];
  for (const g of genres) {
    const n = typeof g === "string" ? g : g?.name;
    if (typeof n === "string" && n.trim()) out.push(n.trim());
  }
  return out;
}

/**
 * Build a compact payload for taste / LLM prompts (no raw titles list to save tokens).
 * @param {import("@prisma/client").MovieEntry[]} movies
 * @param {import("@prisma/client").SeriesEntry[]} series
 */
export function buildLibraryStatsPayload(movies, series) {
  const { totalMinutes, movieMinutes, seriesMinutes } = computeWatchMinutes(movies, series);
  const genreCounts = new Map();
  const decadeCounts = new Map();

  const addGenres = (genres) => {
    for (const name of genreNamesFromJson(genres)) {
      genreCounts.set(name, (genreCounts.get(name) || 0) + 1);
    }
  };

  for (const m of movies || []) {
    addGenres(m.genres);
    const dec = decadeFromYear(m.year);
    if (dec) decadeCounts.set(dec, (decadeCounts.get(dec) || 0) + 1);
  }
  for (const s of series || []) {
    addGenres(s.genres);
    const dec = decadeFromYear(startYearFromSeriesYears(s.years));
    if (dec) decadeCounts.set(dec, (decadeCounts.get(dec) || 0) + 1);
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topDecades = [...decadeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([decade, count]) => ({ decade, count }));

  let rated = 0;
  let ratingSum = 0;
  for (const m of movies || []) {
    if (m.userRating != null && m.userRating > 0) {
      rated += 1;
      ratingSum += m.userRating;
    }
  }
  for (const s of series || []) {
    if (s.userRating != null && s.userRating > 0) {
      rated += 1;
      ratingSum += s.userRating;
    }
  }
  const avgUserRating = rated > 0 ? Math.round((ratingSum / rated) * 10) / 10 : null;

  return {
    movieCount: (movies || []).length,
    seriesCount: (series || []).length,
    entryCount: (movies || []).length + (series || []).length,
    totalMinutesWatched: totalMinutes,
    movieMinutes,
    seriesMinutes,
    topGenres,
    topDecades,
    ratedCount: rated,
    avgUserRatingOutOf10: avgUserRating,
    note:
      "Original language is not stored in this app; infer language skew only if impossible from data.",
  };
}

/**
 * Titles the LLM must ground taste / blind spot / month / entry pick on.
 * Uses top 10 by user rating when any exist; otherwise most recently logged watches.
 * @param {import("@prisma/client").MovieEntry[]} movies
 * @param {import("@prisma/client").SeriesEntry[]} series
 */
export function buildTasteAnchorLists(movies, series) {
  const mList = movies || [];
  const sList = series || [];

  const compactMovie = (m, withRating) => {
    const g = genreNamesFromJson(m.genres).slice(0, 5);
    const o = { title: m.title, year: m.year, genres: g };
    if (withRating && m.userRating != null && m.userRating > 0) {
      o.yourRatingOutOf10 = m.userRating;
    }
    return o;
  };

  const compactSeries = (s, withRating) => {
    const g = genreNamesFromJson(s.genres).slice(0, 5);
    const o = { title: s.title, years: s.years, genres: g };
    if (withRating && s.userRating != null && s.userRating > 0) {
      o.yourRatingOutOf10 = s.userRating;
    }
    return o;
  };

  const ratedMovies = mList
    .filter((m) => m.userRating != null && m.userRating > 0)
    .sort((a, b) => b.userRating - a.userRating || b.year - a.year);
  const ratedSeries = sList
    .filter((s) => s.userRating != null && s.userRating > 0)
    .sort((a, b) => b.userRating - a.userRating);

  const recentMovies = [...mList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentSeries = [...sList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const useRatedMovies = ratedMovies.length > 0;
  const useRatedSeries = ratedSeries.length > 0;

  const moviesAnchors = (useRatedMovies ? ratedMovies : recentMovies)
    .slice(0, 10)
    .map((m) => compactMovie(m, useRatedMovies));
  const seriesAnchors = (useRatedSeries ? ratedSeries : recentSeries)
    .slice(0, 10)
    .map((s) => compactSeries(s, useRatedSeries));

  const movieLine = useRatedMovies
    ? "Movies: top 10 by your rating (highest first)."
    : "Movies: you have no ratings — these are your 10 most recently logged films.";
  const seriesLine = useRatedSeries
    ? "Series: top 10 by your rating (highest first)."
    : "Series: you have no ratings — these are your 10 most recently logged shows.";

  return {
    movies: moviesAnchors,
    series: seriesAnchors,
    movieAnchorMode: useRatedMovies ? "top_rated" : "watched_recent",
    seriesAnchorMode: useRatedSeries ? "top_rated" : "watched_recent",
    instruction: `${movieLine} ${seriesLine} Ground taste summary, bullets, blind spot, stretch, entry pick, and symbolic month ONLY on these rows plus the numeric aggregates in stats. When naming favorites, use only titles from these lists.`,
  };
}

/** ISO week key e.g. 2026-W13 (UTC). */
export function currentIsoWeekKey(d = new Date()) {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const year = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

/** Calendar month key e.g. 2026-03 */
export function currentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
