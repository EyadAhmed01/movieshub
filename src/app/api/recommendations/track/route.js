import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED = new Set(["click", "watchlist_add", "rate_pos"]);

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const impressionId = typeof body?.impressionId === "string" ? body.impressionId : "";
  const kind = String(body?.kind || "");

  if (!impressionId || !ALLOWED.has(kind)) {
    return NextResponse.json({ error: "impressionId and valid kind required" }, { status: 400 });
  }

  const imp = await prisma.recImpression.findFirst({
    where: { id: impressionId, userId: session.user.id },
    select: { id: true, tmdbId: true, mediaType: true },
  });
  if (!imp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recEvent.create({
    data: {
      userId: session.user.id,
      tmdbId: imp.tmdbId,
      mediaType: imp.mediaType,
      kind,
    },
  });

  return NextResponse.json({ ok: true });
}
