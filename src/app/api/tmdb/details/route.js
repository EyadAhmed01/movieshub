import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchMovieByTmdbId, fetchTvByTmdbId } from "@/lib/tmdb";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    if (type === "movie") {
      const d = await fetchMovieByTmdbId(id);
      if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        detail: {
          mediaType: "movie",
          tmdbId: id,
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
        },
      });
    }
    const d = await fetchTvByTmdbId(id);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const yearStart = d.years ? parseInt(String(d.years), 10) : null;
    return NextResponse.json({
      detail: {
        mediaType: "tv",
        tmdbId: id,
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
        episodesCount: d.eps,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "TMDB error" }, { status: 502 });
  }
}
