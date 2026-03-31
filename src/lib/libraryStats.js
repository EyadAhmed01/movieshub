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
