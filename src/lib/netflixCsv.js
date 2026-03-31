/**
 * Parse Netflix “Viewing Activity” style CSV: strip BOM, quotes, odd spacing.
 * Works with privacy-export CSVs (Title + date/time columns) and simple Title,Date files.
 */

const TITLE_HEADER_RE = /^(title|show|series|program|nom|titel|name)$/i;
const DATE_HEADER_RE = /^(date|time|start|started|watched|viewed|datum|fecha)$/i;

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
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (re.test(headers[i]) || (h && re.test(h))) return i;
  }
  return -1;
}

function looseTitleColumn(headers) {
  const i = findColumnIndex(headers, TITLE_HEADER_RE);
  if (i >= 0) return i;
  return 0;
}

function looseDateColumn(headers) {
  const i = findColumnIndex(headers, DATE_HEADER_RE);
  return i >= 0 ? i : -1;
}

/** Extract year from Netflix-style datetime strings. */
export function yearFromNetflixDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  const iso = s.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
  if (iso) return parseInt(iso[0].slice(0, 4), 10);
  const mdy = s.match(/\b(0?\d{1,2})[./-](0?\d{1,2})[./-]((19|20)\d{2})\b/);
  if (mdy) return parseInt(mdy[3], 10);
  const dmy = s.match(/\b(0?\d{1,2})[./-](0?\d{1,2})[./-]((19|20)\d{2})\b/);
  if (dmy) return parseInt(dmy[3], 10);
  const y = s.match(/\b(19|20)\d{2}\b/);
  return y ? parseInt(y[0], 10) : null;
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
 * One row per show or movie (episodes collapsed to series name).
 */
export function dedupeNetflixRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const t = row.title;
    const colon = t.indexOf(":");
    const key =
      colon > 0
        ? `tv:${cleanCsvCell(t.slice(0, colon)).toLowerCase()}`
        : `m:${t.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        title: t,
        seriesPrefix: colon > 0 ? cleanCsvCell(t.slice(0, colon)) : null,
        dateRaw: row.dateRaw,
        line: row.line,
      });
    }
  }
  return [...map.values()];
}
