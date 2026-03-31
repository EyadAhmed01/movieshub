import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchMovieByTmdbId,
  fetchTvByTmdbId,
  tmdbConfigured,
  searchMovieBestMatchId,
  searchTvBestMatchId,
} from "@/lib/tmdb";
import { inferPrincipalCast, llmConfigured } from "@/lib/llm";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasCast(row) {
  return Array.isArray(row.cast) && row.cast.length > 0;
}

/**
 * True if any TMDB-identified cast row lacks a stored profile image (legacy saves had id + name only).
 * Ignores AI-inferred rows (no person id) and avoids useless re-fetches when there is no TMDB id.
 */
function castMissingProfilePhotos(cast) {
  if (!Array.isArray(cast) || cast.length === 0) return false;
  return cast.some((c) => {
    const p = c?.profilePath ?? c?.profile_path;
    if (typeof p === "string" && p.trim() !== "") return false;
    if (c?.inferred === true) return false;
    return typeof c?.id === "number" && c.id > 0;
  });
}

function parseStartYear(yearsStr) {
  const m = String(yearsStr || "").match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!tmdbConfigured()) {
    return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 400 });
  }

  let inferCast = false;
  let force = false;
  try {
    const body = await request.json();
    inferCast = Boolean(body?.inferCast);
    force = Boolean(body?.force);
  } catch {
    /* no body */
  }

  const userId = session.user.id;

  let updatedMovies = 0;
  let updatedSeries = 0;
  let linkedBySearchMovies = 0;
  let linkedBySearchSeries = 0;
  let inferredMovies = 0;
  let inferredSeries = 0;

  const runTmdbPass = async () => {
    const [movies, series] = await Promise.all([
      prisma.movieEntry.findMany({ where: { userId } }),
      prisma.seriesEntry.findMany({ where: { userId } }),
    ]);

    for (const m of movies) {
      if (!m.tmdbId) continue;
      if (!force) {
        const hasG = Array.isArray(m.genres) && m.genres.length > 0;
        const needs =
          m.runtimeMinutes == null ||
          m.runtimeMinutes <= 0 ||
          !hasG ||
          !hasCast(m) ||
          castMissingProfilePhotos(m.cast);
        if (!needs) continue;
      }
      const meta = await fetchMovieByTmdbId(m.tmdbId);
      await sleep(120);
      if (!meta) continue;
      await prisma.movieEntry.update({
        where: { id: m.id },
        data: {
          posterPath: meta.posterPath ?? m.posterPath,
          overview: meta.overview ?? m.overview,
          voteAverage: meta.voteAverage ?? m.voteAverage,
          runtimeMinutes: meta.runtimeMinutes ?? m.runtimeMinutes,
          genres: meta.genres?.length ? meta.genres : m.genres,
          cast: meta.cast?.length ? meta.cast : m.cast,
        },
      });
      updatedMovies += 1;
    }

    for (const s of series) {
      if (!s.tmdbId) continue;
      if (!force) {
        const hasG = Array.isArray(s.genres) && s.genres.length > 0;
        const needs =
          s.episodeRuntimeMinutes == null ||
          s.episodeRuntimeMinutes <= 0 ||
          !hasG ||
          !hasCast(s) ||
          castMissingProfilePhotos(s.cast);
        if (!needs) continue;
      }
      const meta = await fetchTvByTmdbId(s.tmdbId);
      await sleep(120);
      if (!meta) continue;
      await prisma.seriesEntry.update({
        where: { id: s.id },
        data: {
          posterPath: meta.posterPath ?? s.posterPath,
          overview: meta.overview ?? s.overview,
          voteAverage: meta.voteAverage ?? s.voteAverage,
          years: meta.years || s.years,
          eps: meta.eps ?? s.eps,
          episodeRuntimeMinutes: meta.episodeRuntimeMinutes ?? s.episodeRuntimeMinutes,
          genres: meta.genres?.length ? meta.genres : s.genres,
          cast: meta.cast?.length ? meta.cast : s.cast,
        },
      });
      updatedSeries += 1;
    }
  };

  await runTmdbPass();

  const [moviesB, seriesB] = await Promise.all([
    prisma.movieEntry.findMany({ where: { userId } }),
    prisma.seriesEntry.findMany({ where: { userId } }),
  ]);

  for (const m of moviesB) {
    if (hasCast(m)) continue;
    if (m.tmdbId) continue;
    const tid = await searchMovieBestMatchId(m.title, m.year);
    await sleep(150);
    if (!tid) continue;
    const meta = await fetchMovieByTmdbId(tid);
    await sleep(120);
    if (!meta) continue;
    await prisma.movieEntry.update({
      where: { id: m.id },
      data: {
        tmdbId: tid,
        title: meta.title || m.title,
        year: meta.year ?? m.year,
        posterPath: meta.posterPath ?? m.posterPath,
        overview: meta.overview ?? m.overview,
        voteAverage: meta.voteAverage ?? m.voteAverage,
        runtimeMinutes: meta.runtimeMinutes ?? m.runtimeMinutes,
        genres: meta.genres?.length ? meta.genres : m.genres,
        cast: meta.cast?.length ? meta.cast : m.cast,
      },
    });
    linkedBySearchMovies += 1;
  }

  for (const s of seriesB) {
    if (hasCast(s)) continue;
    if (s.tmdbId) continue;
    const y0 = parseStartYear(s.years);
    const tid = await searchTvBestMatchId(s.title, y0);
    await sleep(150);
    if (!tid) continue;
    const meta = await fetchTvByTmdbId(tid);
    await sleep(120);
    if (!meta) continue;
    await prisma.seriesEntry.update({
      where: { id: s.id },
      data: {
        tmdbId: tid,
        title: meta.title || s.title,
        years: meta.years || s.years,
        eps: meta.eps ?? s.eps,
        posterPath: meta.posterPath ?? s.posterPath,
        overview: meta.overview ?? s.overview,
        voteAverage: meta.voteAverage ?? s.voteAverage,
        episodeRuntimeMinutes: meta.episodeRuntimeMinutes ?? s.episodeRuntimeMinutes,
        genres: meta.genres?.length ? meta.genres : s.genres,
        cast: meta.cast?.length ? meta.cast : s.cast,
      },
    });
    linkedBySearchSeries += 1;
  }

  if (inferCast && llmConfigured()) {
    const [moviesC, seriesC] = await Promise.all([
      prisma.movieEntry.findMany({ where: { userId } }),
      prisma.seriesEntry.findMany({ where: { userId } }),
    ]);

    for (const m of moviesC) {
      if (hasCast(m)) continue;
      try {
        const cast = await inferPrincipalCast({
          title: m.title,
          year: m.year,
          mediaType: "movie",
        });
        await sleep(400);
        if (!cast.length) continue;
        await prisma.movieEntry.update({
          where: { id: m.id },
          data: { cast },
        });
        inferredMovies += 1;
      } catch {
        /* skip */
      }
    }

    for (const s of seriesC) {
      if (hasCast(s)) continue;
      try {
        const cast = await inferPrincipalCast({
          title: s.title,
          year: parseStartYear(s.years),
          mediaType: "tv",
        });
        await sleep(400);
        if (!cast.length) continue;
        await prisma.seriesEntry.update({
          where: { id: s.id },
          data: { cast },
        });
        inferredSeries += 1;
      } catch {
        /* skip */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    updatedMovies,
    updatedSeries,
    linkedBySearchMovies,
    linkedBySearchSeries,
    inferredMovies,
    inferredSeries,
    inferCastRequested: inferCast,
    inferCastSkipped: inferCast && !llmConfigured(),
  });
}
