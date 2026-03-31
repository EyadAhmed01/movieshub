function escCell(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function buildLibraryCsv(movies, series) {
  const lines = ["type,title,year_or_years,user_rating,tmdb_id"];
  for (const m of movies || []) {
    lines.push(
      ["movie", escCell(m.title), m.year, m.userRating ?? "", m.tmdbId ?? ""].join(",")
    );
  }
  for (const s of series || []) {
    lines.push(
      ["series", escCell(s.title), escCell(s.years), s.userRating ?? "", s.tmdbId ?? ""].join(",")
    );
  }
  return lines.join("\r\n");
}

export function downloadTextFile(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff", text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
