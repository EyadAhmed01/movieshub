import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tmdbConfigured } from "@/lib/tmdb";
import { importNetflixCsvForUser } from "@/lib/netflixImport";

const MAX_CSV_CHARS = 2_000_000;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!tmdbConfigured()) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is required to match titles and load year + ratings." },
      { status: 400 }
    );
  }

  let csvText = "";
  let startIndex = 0;
  const ct = request.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const buf = await file.arrayBuffer();
      csvText = new TextDecoder("utf-8").decode(buf);
    } else {
      const t = form.get("csv");
      if (typeof t === "string") csvText = t;
    }
    const si = form.get("startIndex");
    if (si != null) startIndex = Math.max(0, parseInt(String(si), 10) || 0);
  } else {
    try {
      const body = await request.json();
      if (typeof body?.csv === "string") csvText = body.csv;
      if (body?.startIndex != null) {
        const n = Number(body.startIndex);
        if (Number.isFinite(n)) startIndex = Math.max(0, Math.floor(n));
      }
    } catch {
      return NextResponse.json({ error: "Send JSON { csv: \"...\" } or multipart file field \"file\"." }, { status: 400 });
    }
  }

  csvText = String(csvText || "").trim();
  if (!csvText) {
    return NextResponse.json({ error: "Empty CSV." }, { status: 400 });
  }
  if (csvText.length > MAX_CSV_CHARS) {
    return NextResponse.json({ error: "CSV too large; split into smaller files (max ~2MB text)." }, { status: 400 });
  }

  try {
    const summary = await importNetflixCsvForUser(prisma, session.user.id, csvText, { startIndex });
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
