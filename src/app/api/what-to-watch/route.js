import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { llmConfigured, suggestWhatToWatch } from "@/lib/llm";
import { searchTmdb, tmdbConfigured } from "@/lib/tmdb";
import { WTW_FORMATS, WTW_GENRES, WTW_MOODS, WTW_TONES } from "@/lib/whatToWatchChoices";

const ALLOWED = {
  mood: new Set(WTW_MOODS),
  genre: new Set(WTW_GENRES),
  format: new Set(WTW_FORMATS),
  tone: new Set(WTW_TONES),
};

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "Configure GROQ_API_KEY or LLM_PROVIDER=ollama for recommendations." },
      { status: 503 }
    );
  }
  if (!tmdbConfigured()) {
    return NextResponse.json(
      { error: "TMDB_API_KEY required to link Add to list." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mood = String(body?.mood || "");
  const genre = String(body?.genre || "");
  const format = String(body?.format || "");
  const tone = String(body?.tone || "");

  if (!ALLOWED.mood.has(mood) || !ALLOWED.genre.has(genre) || !ALLOWED.format.has(format) || !ALLOWED.tone.has(tone)) {
    return NextResponse.json({ error: "Invalid choice values." }, { status: 400 });
  }

  try {
    const suggestion = await suggestWhatToWatch({ mood, genre, format, tone });

    let searchType =
      format === "Movie" ? "movie" : format === "TV series" ? "tv" : suggestion.mediaType === "tv" ? "tv" : "movie";

    let { results } = await searchTmdb(suggestion.title, searchType);
    let picked = results?.[0];
    let resolvedType = searchType;

    if (!picked && format === "Either") {
      const alt = searchType === "movie" ? "tv" : "movie";
      const altRes = await searchTmdb(suggestion.title, alt);
      if (altRes.results?.[0]) {
        picked = altRes.results[0];
        resolvedType = alt;
      }
    }

    if (!picked) {
      const alt = searchType === "movie" ? "tv" : "movie";
      const altRes = await searchTmdb(suggestion.title, alt);
      picked = altRes.results?.[0];
      if (picked) resolvedType = alt;
    }

    return NextResponse.json({
      suggestion,
      tmdbMatch: picked
        ? {
            tmdbId: picked.tmdbId,
            mediaType: resolvedType,
            title: picked.title,
            year: picked.year,
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestion failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
