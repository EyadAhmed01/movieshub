import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TOP_BILLED_CAST_LIMIT } from "@/lib/tmdb";

function asCastList(cast) {
  if (!cast || !Array.isArray(cast)) return [];
  return cast.filter((c) => c && typeof c.name === "string");
}

/** Only top-billed slots count toward “most watched actor” (stored list is already TMDB order; cap legacy long lists). */
function castForStats(cast) {
  return asCastList(cast).slice(0, TOP_BILLED_CAST_LIMIT);
}

function castHasInferred(cast) {
  return asCastList(cast).some((c) => c.inferred === true);
}

function actorKey(c) {
  if (typeof c.id === "number") return `id:${c.id}`;
  return `name:${c.name.toLowerCase().trim()}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [movies, series] = await Promise.all([
    prisma.movieEntry.findMany({ where: { userId } }),
    prisma.seriesEntry.findMany({ where: { userId } }),
  ]);

  const topMovies = [...movies]
    .filter((m) => m.userRating != null)
    .sort((a, b) => b.userRating - a.userRating)
    .slice(0, 5);

  const topSeries = [...series]
    .filter((s) => s.userRating != null)
    .sort((a, b) => b.userRating - a.userRating)
    .slice(0, 5);

  let movieMinutes = 0;
  for (const m of movies) {
    if (typeof m.runtimeMinutes === "number" && m.runtimeMinutes > 0) {
      movieMinutes += m.runtimeMinutes;
    }
  }

  let seriesMinutes = 0;
  for (const s of series) {
    const ep = s.episodeRuntimeMinutes;
    const eps = s.eps;
    if (typeof ep === "number" && ep > 0 && typeof eps === "number" && eps > 0) {
      seriesMinutes += ep * eps;
    }
  }

  const actorCounts = new Map();
  for (const m of movies) {
    for (const c of castForStats(m.cast)) {
      const k = actorKey(c);
      const prev = actorCounts.get(k);
      const path = c.profilePath && typeof c.profilePath === "string" ? c.profilePath : null;
      if (prev) {
        prev.count += 1;
        if (!prev.profilePath && path) prev.profilePath = path;
      } else {
        actorCounts.set(k, { name: c.name, id: c.id ?? null, count: 1, profilePath: path });
      }
    }
  }
  for (const s of series) {
    for (const c of castForStats(s.cast)) {
      const k = actorKey(c);
      const prev = actorCounts.get(k);
      const path = c.profilePath && typeof c.profilePath === "string" ? c.profilePath : null;
      if (prev) {
        prev.count += 1;
        if (!prev.profilePath && path) prev.profilePath = path;
      } else {
        actorCounts.set(k, { name: c.name, id: c.id ?? null, count: 1, profilePath: path });
      }
    }
  }

  const actorsSorted = [...actorCounts.values()].sort((a, b) => b.count - a.count);
  const topActors = actorsSorted.slice(0, 12);

  const moviesMissingRuntime = movies.filter(
    (m) => m.tmdbId && (m.runtimeMinutes == null || m.runtimeMinutes <= 0)
  ).length;
  const seriesMissingRuntime = series.filter(
    (s) => s.tmdbId && (s.episodeRuntimeMinutes == null || s.episodeRuntimeMinutes <= 0)
  ).length;
  const entriesMissingCast = movies.filter((m) => !castForStats(m.cast).length).length +
    series.filter((s) => !castForStats(s.cast).length).length;

  const entriesWithInferredCast =
    movies.filter((m) => castHasInferred(m.cast)).length +
    series.filter((s) => castHasInferred(s.cast)).length;

  return NextResponse.json({
    totalMinutesWatched: movieMinutes + seriesMinutes,
    movieMinutes,
    seriesMinutes,
    topMovies,
    topSeries,
    topActors,
    metaHints: {
      moviesMissingRuntime,
      seriesMissingRuntime,
      entriesMissingCast,
      entriesWithInferredCast,
    },
  });
}
