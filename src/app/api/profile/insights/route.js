import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentBadge } from "@/lib/badges";
import {
  buildLibraryStatsPayload,
  currentIsoWeekKey,
  currentMonthKey,
} from "@/lib/libraryStats";
import { generateProfileInsights, llmConfigured } from "@/lib/llm";

function formatWatchTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "0 min";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h <= 0) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function emptyLibraryInsights() {
  return {
    tasteSummary:
      "Your reel is still empty — log a film or show and we’ll roast your taste with love next time.",
    patternBullets: [
      "No genre skew yet",
      "Decades unknown to science",
      "The couch believes in you",
    ],
    blindSpot: "The entire library — in a good way. You’re a blank festival slate.",
    stretchGoal: "Add one thing you actually finished this week.",
    entryPick: {
      title: "The Grand Budapest Hotel",
      mediaType: "movie",
      why: "Colorful, tight, and a gentle on-ramp if you’re not sure where to start.",
    },
    symbolicMonth: {
      name: "January",
      tagline: "Fresh-slate energy — even your watchlist is making resolutions.",
      whyChosen:
        "We picked January because you’re at the beginning of the story. Come back after a few logs and we’ll assign you a moodier month.",
    },
  };
}

function cacheValid(cache, weekKey, monthKey) {
  if (!cache || typeof cache !== "object") return false;
  return cache.tasteWeekKey === weekKey && cache.monthKey === monthKey;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, movies, series] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, insightsCache: true },
    }),
    prisma.movieEntry.findMany({ where: { userId } }),
    prisma.seriesEntry.findMany({ where: { userId } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stats = buildLibraryStatsPayload(movies, series);
  const currentBadge = getCurrentBadge(stats.totalMinutesWatched);
  const weekKey = currentIsoWeekKey();
  const monthKey = currentMonthKey();

  const base = {
    stats: {
      ...stats,
      watchTimeLabel: formatWatchTime(stats.totalMinutesWatched),
    },
    currentBadge,
    weekKey,
    monthKey,
    llmConfigured: llmConfigured(),
  };

  if (stats.entryCount === 0) {
    const insights = emptyLibraryInsights();
    return NextResponse.json({
      ...base,
      insights,
      fromCache: false,
      emptyLibrary: true,
    });
  }

  let cache = user.insightsCache;
  if (typeof cache === "string") {
    try {
      cache = JSON.parse(cache);
    } catch {
      cache = null;
    }
  }

  if (cacheValid(cache, weekKey, monthKey) && cache?.tasteSummary) {
    return NextResponse.json({
      ...base,
      insights: {
        tasteSummary: cache.tasteSummary,
        patternBullets: cache.patternBullets || [],
        blindSpot: cache.blindSpot,
        stretchGoal: cache.stretchGoal,
        entryPick: cache.entryPick || { title: "", mediaType: "movie", why: "" },
        symbolicMonth: cache.symbolicMonth || { name: "", tagline: "", whyChosen: "" },
      },
      fromCache: true,
      cachedAt: cache.updatedAt || null,
    });
  }

  if (!llmConfigured()) {
    return NextResponse.json({
      ...base,
      insights: null,
      llmError: "Add GROQ_API_KEY or set LLM_PROVIDER=ollama to generate taste insights.",
      fromCache: false,
    });
  }

  try {
    const generated = await generateProfileInsights({
      stats,
      weekKey,
      monthKey,
      displayName: user.name,
    });
    const toStore = {
      tasteWeekKey: weekKey,
      monthKey,
      updatedAt: new Date().toISOString(),
      tasteSummary: generated.tasteSummary,
      patternBullets: generated.patternBullets,
      blindSpot: generated.blindSpot,
      stretchGoal: generated.stretchGoal,
      entryPick: generated.entryPick,
      symbolicMonth: generated.symbolicMonth,
    };
    await prisma.user.update({
      where: { id: userId },
      data: { insightsCache: toStore },
    });
    return NextResponse.json({
      ...base,
      insights: generated,
      fromCache: false,
      cachedAt: toStore.updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Insight generation failed";
    if (cache && cache.tasteSummary) {
      return NextResponse.json({
        ...base,
        insights: {
          tasteSummary: cache.tasteSummary,
          patternBullets: cache.patternBullets || [],
          blindSpot: cache.blindSpot,
          stretchGoal: cache.stretchGoal,
          entryPick: cache.entryPick || { title: "", mediaType: "movie", why: "" },
          symbolicMonth: cache.symbolicMonth || { name: "", tagline: "", whyChosen: "" },
        },
        fromCache: true,
        staleFallback: true,
        llmError: msg,
        cachedAt: cache.updatedAt || null,
      });
    }
    return NextResponse.json({
      ...base,
      insights: null,
      fromCache: false,
      llmError: msg,
    });
  }
}
