import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchTvByTmdbId } from "@/lib/tmdb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const series = await prisma.seriesEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  const sorted = [...series].sort((a, b) => {
    const ay = parseInt(String(a.years), 10);
    const by = parseInt(String(b.years), 10);
    return (Number.isFinite(ay) ? ay : 0) - (Number.isFinite(by) ? by : 0);
  });
  return NextResponse.json(sorted);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  let title = String(body.title || "").trim();
  let years = String(body.years || "").trim();
  let eps = body.eps != null && body.eps !== "" ? Number(body.eps) : null;
  const tmdbId = body.tmdbId != null ? Number(body.tmdbId) : null;

  if (!title || !years) {
    return NextResponse.json({ error: "Title and years required." }, { status: 400 });
  }
  if (eps != null && !Number.isFinite(eps)) eps = null;

  let posterPath = null;
  let overview = null;
  let voteAverage = null;

  if (tmdbId && Number.isFinite(tmdbId)) {
    const meta = await fetchTvByTmdbId(tmdbId);
    if (meta) {
      title = meta.title || title;
      years = meta.years || years;
      eps = meta.eps ?? eps;
      posterPath = meta.posterPath;
      overview = meta.overview;
      voteAverage = meta.voteAverage;
    }
  }

  const row = await prisma.seriesEntry.create({
    data: {
      userId: session.user.id,
      title,
      years,
      eps,
      tmdbId: tmdbId && Number.isFinite(tmdbId) ? tmdbId : null,
      posterPath,
      overview,
      voteAverage,
    },
  });

  return NextResponse.json(row, { status: 201 });
}
