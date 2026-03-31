"use client";

import { useState, useRef } from "react";
import { FF } from "@/lib/fonts";
import BrandLogo from "@/components/BrandLogo";

async function postImportCsv(csv, startIndex = 0) {
  const res = await fetch("/api/import/netflix", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv, startIndex }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const MAX_IMPORT_ROUNDS = 80;

function mergeImportSummaries(accum, round) {
  if (!accum) {
    return {
      parsedRows: round.parsedRows,
      uniqueTitles: round.uniqueTitles,
      batches: 1,
      createdMovies: round.createdMovies,
      createdSeries: round.createdSeries,
      skippedExisting: round.skippedExisting,
      unmatched: [...(round.unmatched || [])],
      importComplete: round.importComplete,
      lastNextStartIndex: round.nextStartIndex,
    };
  }
  return {
    parsedRows: accum.parsedRows,
    uniqueTitles: accum.uniqueTitles,
    batches: accum.batches + 1,
    createdMovies: accum.createdMovies + round.createdMovies,
    createdSeries: accum.createdSeries + round.createdSeries,
    skippedExisting: accum.skippedExisting + round.skippedExisting,
    unmatched: [...accum.unmatched, ...(round.unmatched || [])],
    importComplete: round.importComplete,
    lastNextStartIndex: round.nextStartIndex,
  };
}

export default function NetflixImportPanel({ onImported }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importBatch, setImportBatch] = useState(0);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [paste, setPaste] = useState("");
  const fileRef = useRef(null);

  const run = async (csv) => {
    const text = String(csv || "").trim();
    if (!text) {
      setErr("Add a CSV file or paste the file contents.");
      return;
    }
    setErr("");
    setResult(null);
    setBusy(true);
    setImportBatch(0);
    try {
      let startIndex = 0;
      let merged = null;
      let rounds = 0;
      while (rounds < MAX_IMPORT_ROUNDS) {
        rounds += 1;
        setImportBatch(rounds);
        const s = await postImportCsv(text, startIndex);
        merged = mergeImportSummaries(merged, s);
        if (s.importComplete) break;
        startIndex = s.nextStartIndex ?? startIndex;
        if (startIndex >= (s.uniqueTitles ?? 0)) break;
      }
      onImported?.();
      setResult({
        ...merged,
        truncated: merged ? !merged.importComplete : false,
        stoppedEarly: Boolean(merged && !merged.importComplete),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      setImportBatch(0);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => run(String(r.result || ""));
    r.readAsText(f, "UTF-8");
    e.target.value = "";
  };

  return (
    <>
      {busy && (
        <div className="csv-import-loading-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="csv-import-loading-card">
            <BrandLogo size={96} spinning alt="" />
            <p className="csv-import-loading-title">Importing your CSV</p>
            <p className="csv-import-loading-sub">Matching titles to TMDB — keep this tab open</p>
            {importBatch > 0 && (
              <p className="csv-import-loading-batch">
                Batch <strong>{importBatch}</strong>
                {importBatch >= MAX_IMPORT_ROUNDS - 5 && " · almost at safety limit"}
              </p>
            )}
            <div className="csv-import-loading-bar" aria-hidden>
              <div className="csv-import-loading-bar-fill" />
            </div>
          </div>
        </div>
      )}
    <div style={{ marginTop: 16, borderTop: "1px solid #181818", paddingTop: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "1px solid #333",
          borderRadius: 6,
          color: "#9a9a9a",
          padding: "8px 14px",
          fontSize: 10,
          fontFamily: FF.mono,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        {open ? "▼ Hide CSV import" : "▶ Import viewing history CSV"}
      </button>

      {open && (
        <div style={{ marginTop: 16, maxWidth: 720 }}>
          <div
            style={{
              background: "#111",
              border: "1px solid #252525",
              borderRadius: 10,
              padding: "16px 18px",
              marginBottom: 14,
            }}
          >
            <p style={{ margin: "0 0 10px", fontSize: 11, fontFamily: FF.mono, letterSpacing: "0.14em", color: "#e50914" }}>
              ROTTEN POTATOES · HOW TO GET YOUR FILE
            </p>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: "#9a948a",
                lineHeight: 1.65,
              }}
            >
              <li style={{ marginBottom: 8 }}>
                From your streaming provider’s site, open <strong style={{ color: "#c8c4ba" }}>Account</strong> or{" "}
                <strong style={{ color: "#c8c4ba" }}>Privacy</strong> (wording varies).
              </li>
              <li style={{ marginBottom: 8 }}>
                Request a <strong style={{ color: "#c8c4ba" }}>personal data / viewing activity</strong> export (often a downloadable{" "}
                <strong style={{ color: "#c8c4ba" }}>.zip</strong>).
              </li>
              <li style={{ marginBottom: 8 }}>
                Submit the request; when you receive the email, download the <strong style={{ color: "#c8c4ba" }}>.zip</strong> and unzip it.
              </li>
              <li style={{ marginBottom: 8 }}>
                Open the CSV that lists viewing activity (e.g. <strong style={{ color: "#c8c4ba" }}>ViewingActivity.csv</strong> or similar, sometimes under a{" "}
                <code style={{ color: "#666" }}>CSV</code> folder). Expected header row: <code style={{ color: "#666" }}>Title,Date</code> — titles in quotes, dates like{" "}
                <code style={{ color: "#666" }}>3/30/26</code> (M/D/YY) are supported.
              </li>
              <li>
                Upload that file here (or paste its contents). We strip extra quotes/spacing, match each title to{" "}
                <strong style={{ color: "#c8c4ba" }}>TMDB</strong>, and add <strong style={{ color: "#c8c4ba" }}>year</strong> and{" "}
                <strong style={{ color: "#c8c4ba" }}>TMDB rating</strong> automatically. Episodes are merged into one row per series.
              </li>
            </ol>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
              Requires <code style={{ color: "#666" }}>TMDB_API_KEY</code> in your environment. Provider exports do not include TMDB IDs; matching is best-effort
              (unusual titles may need to be added manually).
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFile} style={{ display: "none" }} />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              style={{
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: 6,
                color: "#c8c4ba",
                padding: "10px 16px",
                fontSize: 11,
                fontFamily: FF.mono,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Choose CSV file
            </button>
            <button
              type="button"
              disabled={busy || !paste.trim()}
              onClick={() => run(paste)}
              style={{
                background: "#e50914",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                padding: "10px 18px",
                fontSize: 11,
                fontFamily: FF.mono,
                fontWeight: 600,
                cursor: busy || !paste.trim() ? "default" : "pointer",
                opacity: busy || !paste.trim() ? 0.45 : 1,
              }}
            >
              Import pasted CSV
            </button>
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Or paste ViewingActivity.csv contents here…"
            rows={5}
            disabled={busy}
            style={{
              width: "100%",
              maxWidth: 640,
              boxSizing: "border-box",
              background: "#0c0c0c",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
              color: "#d8d4cc",
              padding: "12px 14px",
              fontSize: 12,
              fontFamily: FF.mono,
              lineHeight: 1.45,
              resize: "vertical",
            }}
          />

          {err && <p style={{ color: "#c44", fontSize: 13, marginTop: 10 }}>{err}</p>}

          {result && (
            <div style={{ marginTop: 14, fontSize: 13, color: "#8a857c", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 6px", color: "#a8a298" }}>
                Parsed <strong>{result.parsedRows}</strong> rows → <strong>{result.uniqueTitles}</strong> unique titles (after merging
                episodes).
                {result.batches > 1 && (
                  <>
                    {" "}
                    Ran <strong>{result.batches}</strong> server batches (full list scanned automatically).
                  </>
                )}
              </p>
              <p style={{ margin: 0 }}>
                Added movies: <strong style={{ color: "#c8c4ba" }}>{result.createdMovies}</strong> · series:{" "}
                <strong style={{ color: "#c8c4ba" }}>{result.createdSeries}</strong> · already in library:{" "}
                <strong>{result.skippedExisting}</strong> · could not match: <strong>{result.unmatched?.length ?? 0}</strong>
              </p>
              {result.stoppedEarly && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#a77", lineHeight: 1.5 }}>
                  Stopped after {MAX_IMPORT_ROUNDS} batches (safety limit). Import the same file again to continue from where the server left
                  off.
                </p>
              )}
              {result.skippedExisting > 0 &&
                result.createdMovies === 0 &&
                result.createdSeries === 0 &&
                (result.unmatched?.length ?? 0) === 0 &&
                result.importComplete && (
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "#7a7068", lineHeight: 1.5 }}>
                    Every deduped title from this file is already in your library — nothing new to add.
                  </p>
                )}
              {result.unmatched?.length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", color: "#666", fontSize: 12 }}>Show unmatched titles</summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, color: "#555", maxHeight: 160, overflowY: "auto" }}>
                    {result.unmatched.slice(0, 40).map((u, i) => (
                      <li key={i}>
                        {u.title} {u.line ? `(line ${u.line})` : ""}
                      </li>
                    ))}
                    {result.unmatched.length > 40 && <li>…and {result.unmatched.length - 40} more</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
