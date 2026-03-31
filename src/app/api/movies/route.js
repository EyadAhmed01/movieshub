import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchMovieByTmdbId } from "@/lib/tmdb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const movies = await prisma.movieEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { year: "asc" },
  });
  return NextResponse.json(movies);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  let title = String(body.title || "").trim();
  let year = Number(body.year);
  const tmdbId = body.tmdbId != null ? Number(body.tmdbId) : null;

  if (!title || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Title and valid year required." }, { status: 400 });
  }

  let posterPath = null;
  let overview = null;
  let voteAverage = null;

  if (tmdbId && Number.isFinite(tmdbId)) {
    const meta = await fetchMovieByTmdbId(tmdbId);
    if (meta) {
      title = meta.title || title;
      year = meta.year ?? year;
      posterPath = meta.posterPath;
      overview = meta.overview;
      voteAverage = meta.voteAverage;
    }
  }

  const movie = await prisma.movieEntry.create({
    data: {
      userId: session.user.id,
      title,
      year,
      tmdbId: tmdbId && Number.isFinite(tmdbId) ? tmdbId : null,
      posterPath,
      overview,
      voteAverage,
    },
  });

  return NextResponse.json(movie, { status: 201 });
}
