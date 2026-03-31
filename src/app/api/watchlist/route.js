import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchMovieByTmdbId, fetchTvByTmdbId } from "@/lib/tmdb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const mediaType = body.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = Number(body.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 });
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: {
      userId_tmdbId_mediaType: {
        userId: session.user.id,
        tmdbId,
        mediaType,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Already on your list" }, { status: 409 });
  }

  let data;
  if (mediaType === "movie") {
    const d = await fetchMovieByTmdbId(tmdbId);
    if (!d) return NextResponse.json({ error: "TMDB movie not found" }, { status: 404 });
    data = {
      userId: session.user.id,
      tmdbId,
      mediaType: "movie",
      title: d.title,
      year: d.year,
      yearsLabel: null,
      posterPath: d.posterPath,
      overview: d.overview,
      voteAverage: d.voteAverage,
      runtimeMinutes: d.runtimeMinutes,
      episodeRuntimeMinutes: null,
      genres: d.genres || [],
      cast: d.cast || [],
    };
  } else {
    const d = await fetchTvByTmdbId(tmdbId);
    if (!d) return NextResponse.json({ error: "TMDB show not found" }, { status: 404 });
    const yearStart = d.years ? parseInt(String(d.years), 10) : null;
    data = {
      userId: session.user.id,
      tmdbId,
      mediaType: "tv",
      title: d.title,
      year: Number.isFinite(yearStart) ? yearStart : null,
      yearsLabel: d.years || null,
      posterPath: d.posterPath,
      overview: d.overview,
      voteAverage: d.voteAverage,
      runtimeMinutes: null,
      episodeRuntimeMinutes: d.episodeRuntimeMinutes,
      genres: d.genres || [],
      cast: d.cast || [],
    };
  }

  const item = await prisma.watchlistItem.create({ data });
  return NextResponse.json(item, { status: 201 });
}
