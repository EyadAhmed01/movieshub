const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w185";

function key() {
  const k = process.env.TMDB_API_KEY;
  if (!k) return null;
  return k;
}

export function tmdbConfigured() {
  return Boolean(key());
}

/** How many top-billed roles we keep (TMDB `order` = billing importance, lower first). */
export const TOP_BILLED_CAST_LIMIT = 3;

function mapCastCredits(castArr, limit = TOP_BILLED_CAST_LIMIT, rich = false) {
  const rows = (castArr || []).filter((c) => c?.name);
  const sorted = [...rows].sort((a, b) => {
    const oa = typeof a.order === "number" ? a.order : 9999;
    const ob = typeof b.order === "number" ? b.order : 9999;
    return oa - ob;
  });
  return sorted.slice(0, limit).map((c) => {
    const o = {
      name: c.name,
      id: typeof c.id === "number" ? c.id : null,
    };
    if (rich) {
      o.profilePath = c.profile_path || null;
      o.character = c.character || null;
    }
    return o;
  });
}

function mapGenres(genres) {
  return (genres || []).map((g) => g.name).filter(Boolean);
}

export async function searchTmdb(query, type) {
  const apiKey = key();
  if (!apiKey) return { results: [], configured: false };
  const path = type === "tv" ? "search/tv" : "search/movie";
  const url = `${BASE}/${path}?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  const list = (data.results || []).slice(0, 15).map((r) => ({
    tmdbId: r.id,
    title: type === "tv" ? r.name : r.title,
    year: (() => {
      const d = type === "tv" ? r.first_air_date : r.release_date;
      if (!d) return null;
      const y = new Date(d).getFullYear();
      return Number.isFinite(y) ? y : null;
    })(),
    posterPath: r.poster_path,
    overview: r.overview || "",
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
  }));
  return { results: list, configured: true };
}

/**
 * @param {number} tmdbId
 * @param {{ castLimit?: number, richCast?: boolean }} [options]
 */
export async function fetchMovieByTmdbId(tmdbId, options = {}) {
  const castLimit = options.castLimit ?? TOP_BILLED_CAST_LIMIT;
  /** Include profile_path (and character) so stored cast can show headshots in Analytics etc. */
  const richCast = options.richCast ?? true;
  const apiKey = key();
  if (!apiKey) return null;
  const [detailRes, creditsRes] = await Promise.all([
    fetch(`${BASE}/movie/${tmdbId}?api_key=${apiKey}`, { next: { revalidate: 86400 } }),
    fetch(`${BASE}/movie/${tmdbId}/credits?api_key=${apiKey}`, { next: { revalidate: 86400 } }),
  ]);
  if (!detailRes.ok) return null;
  const r = await detailRes.json();
  let cast = [];
  if (creditsRes.ok) {
    const cr = await creditsRes.json();
    cast = mapCastCredits(cr.cast, castLimit, richCast);
  }
  const y = r.release_date ? new Date(r.release_date).getFullYear() : null;
  const runtime =
    typeof r.runtime === "number" && r.runtime > 0 ? r.runtime : null;
  return {
    title: r.title,
    year: Number.isFinite(y) ? y : new Date().getFullYear(),
    posterPath: r.poster_path,
    overview: r.overview || "",
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
    runtimeMinutes: runtime,
    genres: mapGenres(r.genres),
    cast,
  };
}

/**
 * @param {number} tmdbId
 * @param {{ castLimit?: number, richCast?: boolean }} [options]
 */
export async function fetchTvByTmdbId(tmdbId, options = {}) {
  const castLimit = options.castLimit ?? TOP_BILLED_CAST_LIMIT;
  const richCast = options.richCast ?? true;
  const apiKey = key();
  if (!apiKey) return null;
  const [detailRes, creditsRes] = await Promise.all([
    fetch(`${BASE}/tv/${tmdbId}?api_key=${apiKey}`, { next: { revalidate: 86400 } }),
    fetch(`${BASE}/tv/${tmdbId}/credits?api_key=${apiKey}`, { next: { revalidate: 86400 } }),
  ]);
  if (!detailRes.ok) return null;
  const r = await detailRes.json();
  let cast = [];
  if (creditsRes.ok) {
    const cr = await creditsRes.json();
    cast = mapCastCredits(cr.cast, castLimit, richCast);
  }
  const start = r.first_air_date ? new Date(r.first_air_date).getFullYear() : null;
  const end = r.last_air_date ? new Date(r.last_air_date).getFullYear() : null;
  const inProd = r.status === "Ended" || r.status === "Canceled" ? false : true;
  let yearsStr = "";
  if (start) {
    yearsStr = inProd || !end ? `${start}–present` : start === end ? `${start}` : `${start}–${end}`;
  } else {
    yearsStr = "—";
  }
  const eps = typeof r.number_of_episodes === "number" ? r.number_of_episodes : null;
  const ert = r.episode_run_time;
  let episodeRuntimeMinutes = null;
  if (Array.isArray(ert) && ert.length > 0) {
    const sum = ert.reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    const avg = sum / ert.length;
    if (Number.isFinite(avg) && avg > 0) episodeRuntimeMinutes = Math.round(avg);
  }
  return {
    title: r.name,
    years: yearsStr,
    eps,
    posterPath: r.poster_path,
    overview: r.overview || "",
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
    episodeRuntimeMinutes,
    genres: mapGenres(r.genres),
    cast,
  };
}

/**
 * @param {number} tmdbId
 * @param {{ page?: number, noStore?: boolean }} [options] page 1–5; noStore avoids Next fetch cache so refreshes get new TMDB pages.
 */
export async function fetchMovieSimilarAndRecommended(tmdbId, options = {}) {
  const apiKey = key();
  if (!apiKey) return { similar: [], recommended: [] };
  const page = Math.min(5, Math.max(1, Number(options.page) || 1));
  const fetchInit = options.noStore ? { cache: "no-store" } : { next: { revalidate: 3600 } };
  const [simRes, recRes] = await Promise.all([
    fetch(`${BASE}/movie/${tmdbId}/similar?api_key=${apiKey}&page=${page}`, fetchInit),
    fetch(`${BASE}/movie/${tmdbId}/recommendations?api_key=${apiKey}&page=${page}`, fetchInit),
  ]);
  const parse = async (res) => {
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results || []).slice(0, 12).map((x) => ({
      tmdbId: x.id,
      mediaType: "movie",
      title: x.title,
      year: x.release_date
        ? new Date(x.release_date).getFullYear()
        : null,
      posterPath: x.poster_path,
      overview: (x.overview || "").slice(0, 280),
      voteAverage: typeof x.vote_average === "number" ? x.vote_average : null,
      genreIds: Array.isArray(x.genre_ids) ? x.genre_ids : [],
    }));
  };
  const [similar, recommended] = await Promise.all([parse(simRes), parse(recRes)]);
  return { similar, recommended };
}

/**
 * @param {number} tmdbId
 * @param {{ page?: number, noStore?: boolean }} [options]
 */
export async function fetchTvSimilarAndRecommended(tmdbId, options = {}) {
  const apiKey = key();
  if (!apiKey) return { similar: [], recommended: [] };
  const page = Math.min(5, Math.max(1, Number(options.page) || 1));
  const fetchInit = options.noStore ? { cache: "no-store" } : { next: { revalidate: 3600 } };
  const [simRes, recRes] = await Promise.all([
    fetch(`${BASE}/tv/${tmdbId}/similar?api_key=${apiKey}&page=${page}`, fetchInit),
    fetch(`${BASE}/tv/${tmdbId}/recommendations?api_key=${apiKey}&page=${page}`, fetchInit),
  ]);
  const parse = async (res) => {
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results || []).slice(0, 12).map((x) => ({
      tmdbId: x.id,
      mediaType: "tv",
      title: x.name,
      year: x.first_air_date
        ? new Date(x.first_air_date).getFullYear()
        : null,
      posterPath: x.poster_path,
      overview: (x.overview || "").slice(0, 280),
      voteAverage: typeof x.vote_average === "number" ? x.vote_average : null,
      genreIds: Array.isArray(x.genre_ids) ? x.genre_ids : [],
    }));
  };
  const [similar, recommended] = await Promise.all([parse(simRes), parse(recRes)]);
  return { similar, recommended };
}

/** First TMDB person search hit (for AI name → profile matching). */
export async function searchTmdbPerson(query) {
  const apiKey = key();
  const q = String(query || "").trim();
  if (!apiKey || !q) return null;
  const url = `${BASE}/search/person?api_key=${apiKey}&query=${encodeURIComponent(q)}&page=1`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = await res.json();
  const p = (data.results || [])[0];
  if (!p?.name) return null;
  return {
    id: p.id,
    name: p.name,
    profilePath: p.profile_path || null,
  };
}

export function posterUrl(posterPath) {
  if (!posterPath) return null;
  return `${IMG}${posterPath}`;
}

/** Best-effort TMDB movie id from title + release year (fills gaps when user never linked TMDB). */
export async function searchMovieBestMatchId(title, year) {
  const apiKey = key();
  const q = String(title || "").trim();
  if (!apiKey || !q) return null;
  const y = Number.isFinite(Number(year)) ? `&year=${Number(year)}` : "";
  const url = `${BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}${y}&page=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  const r = (data.results || [])[0];
  return typeof r?.id === "number" ? r.id : null;
}

/** Best-effort TV id from show title (first air year optional). */
export async function searchTvBestMatchId(title, firstAirYear) {
  const apiKey = key();
  const q = String(title || "").trim();
  if (!apiKey || !q) return null;
  const url = `${BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(q)}&page=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  const results = data.results || [];
  if (!results.length) return null;
  if (Number.isFinite(Number(firstAirYear))) {
    const y = Number(firstAirYear);
    const match = results.find((x) => {
      const d = x.first_air_date;
      if (!d) return false;
      return new Date(d).getFullYear() === y;
    });
    if (match?.id) return match.id;
  }
  return typeof results[0]?.id === "number" ? results[0].id : null;
}
