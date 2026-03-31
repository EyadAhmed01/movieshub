import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WATCH_BADGES, unlockedBadgeCount } from "@/lib/badges";
import { computeWatchMinutes } from "@/lib/libraryStats";

const DEFAULT_PREFS = {
  showBadgesOnHome: true,
  weeklyDigest: false,
  chatSpoilerMode: "warn",
};

function mergePrefs(stored) {
  const base = { ...DEFAULT_PREFS };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
  return { ...base, ...stored };
}

async function watchSummaryForUser(userId) {
  const [movies, series] = await Promise.all([
    prisma.movieEntry.findMany({ where: { userId }, select: { runtimeMinutes: true } }),
    prisma.seriesEntry.findMany({
      where: { userId },
      select: { episodeRuntimeMinutes: true, eps: true },
    }),
  ]);
  const { totalMinutes } = computeWatchMinutes(movies, series);
  return {
    totalMinutes,
    unlockedBadgeCount: unlockedBadgeCount(totalMinutes),
    badgeTotal: WATCH_BADGES.length,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, preferences: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const watchSummary = await watchSummaryForUser(userId);
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    preferences: mergePrefs(user.preferences),
    createdAt: user.createdAt.toISOString(),
    watchSummary,
  });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const nameRaw = body?.name;
  const preferencesIn = body?.preferences;

  const data = {};
  if (nameRaw !== undefined) {
    const name = String(nameRaw || "").trim();
    if (name.length > 80) {
      return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 });
    }
    data.name = name.length ? name : null;
  }
  if (preferencesIn !== undefined) {
    if (!preferencesIn || typeof preferencesIn !== "object" || Array.isArray(preferencesIn)) {
      return NextResponse.json({ error: "preferences must be an object" }, { status: 400 });
    }
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const merged = mergePrefs(current?.preferences);
    const allowedKeys = ["showBadgesOnHome", "weeklyDigest", "chatSpoilerMode"];
    const next = { ...merged };
    for (const k of allowedKeys) {
      if (k in preferencesIn) {
        if (k === "showBadgesOnHome" || k === "weeklyDigest") {
          next[k] = Boolean(preferencesIn[k]);
        }
        if (k === "chatSpoilerMode") {
          const v = String(preferencesIn[k] || "warn");
          next[k] = v === "open" ? "open" : "warn";
        }
      }
    }
    data.preferences = next;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, email: true, name: true, preferences: true, createdAt: true },
  });
  const watchSummary = await watchSummaryForUser(session.user.id);
  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    preferences: mergePrefs(updated.preferences),
    createdAt: updated.createdAt.toISOString(),
    watchSummary,
  });
}
