import { prisma } from "@/lib/db";
import { computeWatchMinutes } from "@/lib/libraryStats";
import { getCurrentBadge } from "@/lib/badges";

/** Keeps Groq free-tier TPM reasonable: compact rows + hard caps. */
const MAX_CONTEXT_CHARS = 4200;
const MAX_MOVIE_ROWS = 180;
const MAX_SERIES_ROWS = 100;

function escField(s) {
  return String(s ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ")
    .trim();
}

/**
 * One row per title. Tab-separated: kind, title, yearOrYears, ratingOrEmpty.
 * M = movie, S = series. Rating is 1–10 or empty = no score yet.
 */
function movieRow(m) {
  const r =
    m.userRating != null && m.userRating > 0 ? String(Math.round(m.userRating)) : "";
  return `M\t${escField(m.title)}\t${m.year}\t${r}`;
}

function seriesRow(s) {
  const r =
    s.userRating != null && s.userRating > 0 ? String(Math.round(s.userRating)) : "";
  return `S\t${escField(s.title)}\t${escField(s.years)}\t${r}`;
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
    "LIBRARY_SNAPSHOT (compact; authoritative for this user):",
    `profile\tname=${escField(user?.name) || "—"}\tmovies=${movies.length}\tseries=${series.length}\test_hours≈${hours}\tbadge=${badge?.title ?? "none"}`,
    "rows: TAB-separated M|movie or S|series, then title, year_or_years, rating_1_10_or_empty_if_unrated",
    "",
  ].join("\n");

  const mTrunc = movies.length > MAX_MOVIE_ROWS;
  const mRows = (mTrunc ? movies.slice(0, MAX_MOVIE_ROWS) : movies).map(movieRow);
  const mNote = mTrunc ? `…+${movies.length - MAX_MOVIE_ROWS} more movies omitted\n` : "";

  const sTrunc = series.length > MAX_SERIES_ROWS;
  const sRows = (sTrunc ? series.slice(0, MAX_SERIES_ROWS) : series).map(seriesRow);
  const sNote = sTrunc ? `…+${series.length - MAX_SERIES_ROWS} more series omitted\n` : "";

  let body = `${header}${mRows.join("\n")}\n${mNote}${sRows.join("\n")}\n${sNote}`.trimEnd();

  if (body.length > MAX_CONTEXT_CHARS) {
    body = body.slice(0, MAX_CONTEXT_CHARS - 60).trimEnd();
    body += "\n…truncated";
  }

  return body;
}
