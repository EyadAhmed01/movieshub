import { prisma } from "@/lib/db";
import { computeWatchMinutes } from "@/lib/libraryStats";
import { getCurrentBadge } from "@/lib/badges";

const MAX_CONTEXT_CHARS = 12_000;
const MAX_MOVIE_LINES = 450;
const MAX_SERIES_LINES = 250;

function movieLine(m) {
  const r =
    m.userRating != null && m.userRating > 0
      ? `your rating ${m.userRating}/10`
      : "no rating yet (on your list)";
  return `- ${m.title} (${m.year}) — ${r}`;
}

function seriesLine(s) {
  const r =
    s.userRating != null && s.userRating > 0
      ? `your rating ${s.userRating}/10`
      : "no rating yet (on your list)";
  return `- ${s.title} (${s.years}) — ${r}`;
}

/**
 * Text block injected into Mr Potato chat so the LLM can answer from the user’s tracker.
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function buildChatUserContext(userId) {
  const [user, movies, series] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    prisma.movieEntry.findMany({
      where: { userId },
      select: {
        title: true,
        year: true,
        userRating: true,
        runtimeMinutes: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.seriesEntry.findMany({
      where: { userId },
      select: {
        title: true,
        years: true,
        userRating: true,
        episodeRuntimeMinutes: true,
        eps: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const { totalMinutes } = computeWatchMinutes(movies, series);
  const badge = getCurrentBadge(totalMinutes);
  const hours = Math.round((totalMinutes / 60) * 10) / 10;

  const header = [
    "USER PROFILE (Rotten Potatoes — authoritative for this user only):",
    `- Display name: ${user?.name?.trim() || "(not set)"}`,
    `- Movies in library: ${movies.length}; series in library: ${series.length}`,
    `- Estimated time from logged runtimes/episodes: ~${hours} hours (${totalMinutes} min) — approximate`,
    `- Marathon badge: ${badge?.title ?? "none"}`,
    "",
    "MOVIES:",
  ].join("\n");

  const mTrunc = movies.length > MAX_MOVIE_LINES;
  const mList = (mTrunc ? movies.slice(0, MAX_MOVIE_LINES) : movies).map(movieLine);
  const mNote = mTrunc ? `\n… and ${movies.length - MAX_MOVIE_LINES} more movies not listed (length cap).` : "";

  const seriesHeader = "\nSERIES:\n";
  const sTrunc = series.length > MAX_SERIES_LINES;
  const sList = (sTrunc ? series.slice(0, MAX_SERIES_LINES) : series).map(seriesLine);
  const sNote = sTrunc ? `\n… and ${series.length - MAX_SERIES_LINES} more series not listed (length cap).` : "";

  let body = `${header}\n${mList.join("\n")}${mNote}${seriesHeader}${sList.join("\n")}${sNote}`;

  if (body.length > MAX_CONTEXT_CHARS) {
    body = body.slice(0, MAX_CONTEXT_CHARS - 80).trimEnd();
    body += "\n… (context truncated for length — totals above still apply.)";
  }

  return body;
}
