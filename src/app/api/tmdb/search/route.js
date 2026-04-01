import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchTmdb } from "@/lib/tmdb";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const typeRaw = (searchParams.get("type") || "movie").toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [], configured: true });
  }
  try {
    if (typeRaw === "both" || typeRaw === "all") {
      const [mov, tv] = await Promise.all([searchTmdb(q, "movie"), searchTmdb(q, "tv")]);
      const merged = [...mov.results, ...tv.results].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return NextResponse.json({
        results: merged.slice(0, 20),
        configured: mov.configured !== false && tv.configured !== false,
      });
    }
    const type = typeRaw === "tv" ? "tv" : "movie";
    const data = await searchTmdb(q, type);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}
