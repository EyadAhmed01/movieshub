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
  const url = `${BASE}/movie/${tmdbId}?api_key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const r = await res.json();
  const y = r.release_date ? new Date(r.release_date).getFullYear() : null;
  return {
    title: r.title,
    year: Number.isFinite(y) ? y : new Date().getFullYear(),
    posterPath: r.poster_path,
    overview: r.overview || "",
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
  };
}

export async function fetchTvByTmdbId(tmdbId) {
  const apiKey = key();
  if (!apiKey) return null;
  const url = `${BASE}/tv/${tmdbId}?api_key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const r = await res.json();
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
  return {
    title: r.name,
    years: yearsStr,
    eps,
    posterPath: r.poster_path,
    overview: r.overview || "",
    voteAverage: typeof r.vote_average === "number" ? r.vote_average : null,
  };
}

export function posterUrl(posterPath) {
  if (!posterPath) return null;
  return `${IMG}${posterPath}`;
}
