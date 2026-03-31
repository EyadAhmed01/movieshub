/**
 * Parse Netflix “Viewing Activity” style CSV: strip BOM, quotes, odd spacing.
 * Works with privacy-export CSVs (Title + date/time columns) and simple Title,Date files.
 */

const TITLE_HEADER_RE = /^(title|show|series|program|nom|titel|name)$/i;

/** Remove BOM, trim, collapse whitespace, strip wrapping quotes. */
export function cleanCsvCell(s) {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/^["\u201C\u201D]+|["\u201C\u201D]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line, delimiter) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (!inQ && c === delimiter) {
      out.push(cleanCsvCell(cur));
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cleanCsvCell(cur));
  return out;
}

function detectDelimiter(line) {
  const inQuotes = { current: false };
  let commas = 0;
  let semis = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') j += 2;
        else if (line[j] === '"') break;
        else j++;
      }
      i = j;
      continue;
    }
    if (c === ",") commas++;
    if (c === ";") semis++;
  }
  return semis > commas ? ";" : ",";
}

function findColumnIndex(headers, re) {
  for (let i = 0; i < headers.length; i++) {
    const raw = cleanCsvCell(headers[i]).toLowerCase();
    const compact = raw.replace(/[^a-z0-9]/g, "");
    if (re.test(raw) || re.test(compact)) return i;
  }
  return -1;
}

function looseTitleColumn(headers) {
  const i = findColumnIndex(headers, TITLE_HEADER_RE);
  if (i >= 0) return i;
  return 0;
}

function looseDateColumn(headers) {
  for (let i = 0; i < headers.length; i++) {
    const x = cleanCsvCell(headers[i]).toLowerCase();
    if (/\b(date|time|start|watched|viewed|datum|fecha)\b/i.test(x)) return i;
  }
  return -1;
}

/** 2-digit Netflix years: 25→2025, 99→1999 */
function expandTwoDigitYear(yy) {
  const n = parseInt(yy, 10);
  if (!Number.isFinite(n) || n > 99) return null;
  return n < 70 ? 2000 + n : 1900 + n;
}

/** Extract year from Netflix-style datetime strings (incl. M/D/YY from ViewingHistory.csv). */
export function yearFromNetflixDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  const iso = s.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
  if (iso) return parseInt(iso[0].slice(0, 4), 10);
  const mdy4 = s.match(/\b(0?\d{1,2})[./-](0?\d{1,2})[./-]((19|20)\d{2})\b/);
  if (mdy4) return parseInt(mdy4[3], 10);
  const dmy4 = s.match(/\b(0?\d{1,2})[./-](0?\d{1,2})[./-]((19|20)\d{2})\b/);
  if (dmy4) return parseInt(dmy4[3], 10);
  const mdy2 = s.match(/\b(0?\d{1,2})[./-](0?\d{1,2})[./-](\d{2})\b/);
  if (mdy2) {
    const y = expandTwoDigitYear(mdy2[3]);
    if (y != null) return y;
  }
  const y = s.match(/\b(19|20)\d{2}\b/);
  return y ? parseInt(y[0], 10) : null;
}

function normDedupeKey(s) {
  return cleanCsvCell(s).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Netflix title → dedupe key + TMDB TV search string (handles Narcos: Mexico, Season rows, etc.).
 * @returns {{ key: string, searchTvQuery: string | null, fullTitle: string }}
 */
export function netflixTitleToImportParts(rawTitle) {
  const title = cleanCsvCell(rawTitle);
  if (!title) return { key: "skip", searchTvQuery: null, fullTitle: "" };

  const seasonBlock = title.match(/^([\s\S]+?):\s*Season\s+\d+/i);
  if (seasonBlock) {
    const searchPrefix = seasonBlock[1].trim();
    return {
      key: `tv:${normDedupeKey(searchPrefix)}`,
      searchTvQuery: searchPrefix,
      fullTitle: title,
    };
  }

  const partBlock = title.match(/^([\s\S]+?):\s*Part\s+\d+\s*:/i);
  if (partBlock) {
    const searchPrefix = partBlock[1].trim();
    return {
      key: `tv:${normDedupeKey(searchPrefix)}`,
      searchTvQuery: searchPrefix,
      fullTitle: title,
    };
  }

  const limited = title.match(/^([\s\S]+?):\s*Limited Series\s*:/i);
  if (limited) {
    const searchPrefix = limited[1].trim();
    return {
      key: `tv:${normDedupeKey(searchPrefix)}`,
      searchTvQuery: searchPrefix,
      fullTitle: title,
    };
  }

  if (/^Stranger Things\s*:/i.test(title)) {
    return {
      key: "tv:stranger things",
      searchTvQuery: "Stranger Things",
      fullTitle: title,
    };
  }

  const chapterBlock = title.match(/^([\s\S]+?):\s*Chapter\s+/i);
  if (chapterBlock) {
    const searchPrefix = chapterBlock[1].trim();
    return {
      key: `tv:${normDedupeKey(searchPrefix)}`,
      searchTvQuery: searchPrefix,
      fullTitle: title,
    };
  }

  const colonIdx = title.indexOf(":");
  if (colonIdx > 0) {
    const first = title.slice(0, colonIdx).trim();
    const rest = title.slice(colonIdx + 1).trim();
    if (/^episode\s+\d/i.test(rest)) {
      return {
        key: `tv:${normDedupeKey(first)}`,
        searchTvQuery: first,
        fullTitle: title,
      };
    }
    if (/^(the|a|an)\s+/i.test(rest) || rest.length > 52) {
      return {
        key: `m:${normDedupeKey(title)}`,
        searchTvQuery: null,
        fullTitle: title,
      };
    }
    return {
      key: `tv:${normDedupeKey(first)}`,
      searchTvQuery: first,
      fullTitle: title,
    };
  }

  return {
    key: `m:${normDedupeKey(title)}`,
    searchTvQuery: null,
    fullTitle: title,
  };
}

/**
 * @returns {{ title: string, dateRaw: string | null, line: number }[]}
 */
export function parseNetflixCsv(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  const lines = raw.split(/\n/).map((l) => l.replace(/\r$/, ""));
  const nonEmpty = lines.map((l, idx) => ({ l: l.trim(), idx })).filter((x) => x.l.length > 0);
  if (nonEmpty.length === 0) return [];

  const delim = detectDelimiter(nonEmpty[0].l);
  const firstCells = parseCsvLine(nonEmpty[0].l, delim);
  const looksHeader = firstCells.some((c) => TITLE_HEADER_RE.test(cleanCsvCell(c)));

  let titleIdx = 0;
  let dateIdx = -1;
  let startRow = 0;

  if (looksHeader) {
    const headers = firstCells.map(cleanCsvCell);
    titleIdx = looseTitleColumn(headers);
    dateIdx = looseDateColumn(headers);
    startRow = 1;
  }

  const out = [];
  for (let r = startRow; r < nonEmpty.length; r++) {
    const cells = parseCsvLine(nonEmpty[r].l, delim);
    const title = cleanCsvCell(cells[titleIdx] || "");
    if (!title || TITLE_HEADER_RE.test(title)) continue;
    const dateRaw =
      dateIdx >= 0 && cells[dateIdx] != null ? cleanCsvCell(cells[dateIdx]) : null;
    out.push({
      title,
      dateRaw: dateRaw || null,
      line: nonEmpty[r].idx + 1,
    });
  }
  return out;
}

/**
 * One row per show or movie (episodes collapsed using Netflix title shapes).
 */
export function dedupeNetflixRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const parts = netflixTitleToImportParts(row.title);
    if (parts.key === "skip" || !parts.fullTitle) continue;
    if (!map.has(parts.key)) {
      map.set(parts.key, {
        title: parts.fullTitle,
        seriesPrefix: parts.searchTvQuery,
        dateRaw: row.dateRaw,
        line: row.line,
      });
    }
  }
  return [...map.values()];
}
