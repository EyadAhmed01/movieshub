import { searchTmdb, fetchMovieByTmdbId, fetchTvByTmdbId } from "@/lib/tmdb";
import { dedupeNetflixRows, parseNetflixCsv, yearFromNetflixDate } from "@/lib/netflixCsv";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normTitle(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleScore(query, resultTitle) {
  const a = normTitle(query);
  const b = normTitle(resultTitle);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.startsWith(a) || a.startsWith(b)) return 90;
  if (b.includes(a) || a.includes(b)) return 75;
  return 40;
}

function pickBestResult(results, query, yearHint) {
  if (!results?.length) return null;
  let best = null;
  let bestScore = -1;
  for (const r of results) {
    let s = titleScore(query, r.title);
    if (yearHint != null && r.year === yearHint) s += 15;
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  if (bestScore < 35) return results[0];
  return best;
}

/**
 * Match Netflix line to TMDB movie or TV (full metadata via fetch*).
 * @returns {Promise<{ type: 'movie'|'tv', tmdbId: number } | null>}
 */
export async function resolveNetflixLineToTmdb({ title, seriesPrefix, dateRaw }) {
  const yearHint = yearFromNetflixDate(dateRaw || "");
  const full = String(title || "").trim();

  await sleep(35);
  const movieSearch = await searchTmdb(full, "movie");
  const bestMovie = pickBestResult(movieSearch.results || [], full, yearHint);
  const movieSc = bestMovie ? titleScore(full, bestMovie.title) : 0;

  if (seriesPrefix) {
    await sleep(35);
    const tvSearch = await searchTmdb(seriesPrefix, "tv");
    const bestTv = pickBestResult(tvSearch.results || [], seriesPrefix, yearHint);
    const tvSc = bestTv ? titleScore(seriesPrefix, bestTv.title) : 0;

    if (bestMovie && movieSc >= 88) {
      return { type: "movie", tmdbId: bestMovie.tmdbId };
    }
    if (bestTv && (tvSc >= movieSc || movieSc < 70)) {
      return { type: "tv", tmdbId: bestTv.tmdbId };
    }
    if (bestMovie && movieSc >= 70) {
      return { type: "movie", tmdbId: bestMovie.tmdbId };
    }
    if (bestTv) return { type: "tv", tmdbId: bestTv.tmdbId };
    if (bestMovie) return { type: "movie", tmdbId: bestMovie.tmdbId };
    return null;
  }

  if (bestMovie && movieSc >= 65) {
    return { type: "movie", tmdbId: bestMovie.tmdbId };
  }

  await sleep(35);
  const tvFull = await searchTmdb(full, "tv");
  const bestTv2 = pickBestResult(tvFull.results || [], full, yearHint);
  const tvSc2 = bestTv2 ? titleScore(full, bestTv2.title) : 0;

  if (bestTv2 && tvSc2 >= 65) return { type: "tv", tmdbId: bestTv2.tmdbId };
  if (bestMovie) return { type: "movie", tmdbId: bestMovie.tmdbId };
  if (bestTv2) return { type: "tv", tmdbId: bestTv2.tmdbId };
  return null;
}

/**
 * How many deduped titles to scan per HTTP request (TMDB search + optional create).
 * Re-import used to always slice(0,36) so titles after the first 36 never ran; we now
 * accept startIndex and advance nextStartIndex so the client can chain batches.
 */
const MAX_SCAN_PER_REQUEST = Math.min(
  120,
  Math.max(24, parseInt(process.env.NETFLIX_IMPORT_BATCH || "48", 10) || 48)
);

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ startIndex?: number }} [options]
 */
export async function importNetflixCsvForUser(prisma, userId, csvText, options = {}) {
  const startIndex = Math.max(0, Math.floor(Number(options.startIndex) || 0));
  const parsed = parseNetflixCsv(csvText);
  const unique = dedupeNetflixRows(parsed);
  const slice = unique.slice(startIndex, startIndex + MAX_SCAN_PER_REQUEST);

  const summary = {
    parsedRows: parsed.length,
    uniqueTitles: unique.length,
    startIndex,
    processed: slice.length,
    nextStartIndex: startIndex,
    importComplete: startIndex >= unique.length,
    /** @deprecated use importComplete === false */
    truncated: false,
    createdMovies: 0,
    createdSeries: 0,
    skippedExisting: 0,
    unmatched: [],
  };

  if (slice.length === 0) {
    summary.nextStartIndex = unique.length;
    summary.importComplete = true;
    summary.truncated = false;
    return summary;
  }

  for (const row of slice) {
    const resolved = await resolveNetflixLineToTmdb(row);
    if (!resolved) {
      summary.unmatched.push({ title: row.title, line: row.line });
      continue;
    }

    if (resolved.type === "movie") {
      const existing = await prisma.movieEntry.findFirst({
        where: { userId, tmdbId: resolved.tmdbId },
      });
      if (existing) {
        summary.skippedExisting += 1;
        continue;
      }
      const meta = await fetchMovieByTmdbId(resolved.tmdbId);
      await sleep(50);
      if (!meta) {
        summary.unmatched.push({ title: row.title, line: row.line });
        continue;
      }
      await prisma.movieEntry.create({
        data: {
          userId,
          title: meta.title,
          year: meta.year,
          tmdbId: resolved.tmdbId,
          posterPath: meta.posterPath,
          overview: meta.overview,
          voteAverage: meta.voteAverage,
          runtimeMinutes: meta.runtimeMinutes ?? null,
          genres: meta.genres?.length ? meta.genres : null,
          cast: meta.cast?.length ? meta.cast : null,
        },
      });
      summary.createdMovies += 1;
    } else {
      const existing = await prisma.seriesEntry.findFirst({
        where: { userId, tmdbId: resolved.tmdbId },
      });
      if (existing) {
        summary.skippedExisting += 1;
        continue;
      }
      const meta = await fetchTvByTmdbId(resolved.tmdbId);
      await sleep(50);
      if (!meta) {
        summary.unmatched.push({ title: row.title, line: row.line });
        continue;
      }
      await prisma.seriesEntry.create({
        data: {
          userId,
          title: meta.title,
          years: meta.years,
          eps: meta.eps,
          tmdbId: resolved.tmdbId,
          posterPath: meta.posterPath,
          overview: meta.overview,
          voteAverage: meta.voteAverage,
          episodeRuntimeMinutes: meta.episodeRuntimeMinutes ?? null,
          genres: meta.genres?.length ? meta.genres : null,
          cast: meta.cast?.length ? meta.cast : null,
        },
      });
      summary.createdSeries += 1;
    }
  }

  summary.nextStartIndex = startIndex + slice.length;
  summary.importComplete = summary.nextStartIndex >= unique.length;
  summary.truncated = !summary.importComplete;

  return summary;
}
