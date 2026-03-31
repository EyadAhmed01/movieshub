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

function mapCast(castArr, limit = 12) {
  return (castArr || [])
    .slice(0, limit)
    .filter((c) => c?.name)
    .map((c) => ({ name: c.name, id: typeof c.id === "number" ? c.id : null }));
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
  const list = (data.results || []).slice(0, 10).map((r) => ({
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

export async function fetchMovieByTmdbId(tmdbId) {
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
    cast = mapCast(cr.cast);
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

export async function fetchTvByTmdbId(tmdbId) {
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
    cast = mapCast(cr.cast);
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

export async function fetchMovieSimilarAndRecommended(tmdbId) {
  const apiKey = key();
  if (!apiKey) return { similar: [], recommended: [] };
  const [simRes, recRes] = await Promise.all([
    fetch(`${BASE}/movie/${tmdbId}/similar?api_key=${apiKey}&page=1`, {
      next: { revalidate: 3600 },
    }),
    fetch(`${BASE}/movie/${tmdbId}/recommendations?api_key=${apiKey}&page=1`, {
      next: { revalidate: 3600 },
    }),
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
    }));
  };
  const [similar, recommended] = await Promise.all([parse(simRes), parse(recRes)]);
  return { similar, recommended };
}

export async function fetchTvSimilarAndRecommended(tmdbId) {
  const apiKey = key();
  if (!apiKey) return { similar: [], recommended: [] };
  const [simRes, recRes] = await Promise.all([
    fetch(`${BASE}/tv/${tmdbId}/similar?api_key=${apiKey}&page=1`, {
      next: { revalidate: 3600 },
    }),
    fetch(`${BASE}/tv/${tmdbId}/recommendations?api_key=${apiKey}&page=1`, {
      next: { revalidate: 3600 },
    }),
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
    }));
  };
  const [similar, recommended] = await Promise.all([parse(simRes), parse(recRes)]);
  return { similar, recommended };
}

export function posterUrl(posterPath) {
  if (!posterPath) return null;
  return `${IMG}${posterPath}`;
}
