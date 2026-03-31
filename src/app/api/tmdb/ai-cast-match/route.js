import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inferPrincipalCast, llmConfigured } from "@/lib/llm";
import { searchTmdbPerson, tmdbConfigured } from "@/lib/tmdb";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!llmConfigured()) {
    return NextResponse.json({ error: "Configure GROQ_API_KEY or Ollama for AI cast." }, { status: 503 });
  }
  if (!tmdbConfigured()) {
    return NextResponse.json({ error: "TMDB_API_KEY required." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body?.title || "").trim();
  const mediaType = body?.mediaType === "tv" ? "tv" : "movie";
  const year = body?.year != null ? Number(body.year) : null;
  const existingPersonIds = Array.isArray(body?.existingPersonIds)
    ? body.existingPersonIds.filter((id) => typeof id === "number")
    : [];

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  try {
    const inferred = await inferPrincipalCast({
      title,
      year: Number.isFinite(year) ? year : null,
      mediaType,
      maxNames: 8,
    });

    const seen = new Set(existingPersonIds);
    const supplemental = [];

    for (const row of inferred) {
      const name = row?.name;
      if (!name) continue;
      const p = await searchTmdbPerson(name);
      await sleep(70);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        supplemental.push({
          name: p.name,
          id: p.id,
          profilePath: p.profilePath,
          character: null,
          source: "ai",
        });
      }
    }

    return NextResponse.json({ supplemental });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI cast failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
