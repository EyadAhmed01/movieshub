import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchMovieByTmdbId, fetchTvByTmdbId, tmdbConfigured } from "@/lib/tmdb";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!tmdbConfigured()) {
    return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 400 });
  }

  const userId = session.user.id;
  const [movies, series] = await Promise.all([
    prisma.movieEntry.findMany({ where: { userId } }),
    prisma.seriesEntry.findMany({ where: { userId } }),
  ]);

  let updatedMovies = 0;
  let updatedSeries = 0;

  for (const m of movies) {
    if (!m.tmdbId) continue;
    const hasCast = Array.isArray(m.cast) && m.cast.length > 0;
    const hasGenres = Array.isArray(m.genres) && m.genres.length > 0;
    const needs =
      m.runtimeMinutes == null || m.runtimeMinutes <= 0 || !hasGenres || !hasCast;
    if (!needs) continue;
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
    const hasCast = Array.isArray(s.cast) && s.cast.length > 0;
    const hasGenres = Array.isArray(s.genres) && s.genres.length > 0;
    const needs =
      s.episodeRuntimeMinutes == null ||
      s.episodeRuntimeMinutes <= 0 ||
      !hasGenres ||
      !hasCast;
    if (!needs) continue;
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

  return NextResponse.json({
    ok: true,
    updatedMovies,
    updatedSeries,
  });
}
