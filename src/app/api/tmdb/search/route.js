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
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  if (q.length < 2) {
    return NextResponse.json({ results: [], configured: true });
  }
  try {
    const data = await searchTmdb(q, type);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}
