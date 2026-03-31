"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";
const TMDB_FACE = "https://image.tmdb.org/t/p/w92";

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
}

function faceSrc(profilePath) {
  if (!profilePath) return null;
  return `${TMDB_FACE}${profilePath}`;
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function formatMinutes(total) {
  if (!total || total < 1) return "0 min";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h <= 0) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState("");
  /** AI cast when TMDB has none — always on; checkbox removed. */
  const inferCast = true;

  const load = useCallback(async () => {
    setErr("");
    try {
      const j = await apiJson("/api/analytics");
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
  }, [status, load]);

  const runEnrich = async () => {
    setEnriching(true);
    setEnrichMsg("");
    try {
      const r = await apiJson("/api/library/enrich", {
        method: "POST",
        body: JSON.stringify({ inferCast }),
      });
      const parts = [
        `TMDB refresh: ${r.updatedMovies} movies, ${r.updatedSeries} series.`,
        r.linkedBySearchMovies || r.linkedBySearchSeries
          ? `Linked by title search: ${r.linkedBySearchMovies ?? 0} movies, ${r.linkedBySearchSeries ?? 0} series.`
          : null,
        r.inferredMovies || r.inferredSeries
          ? `AI-filled cast (when TMDB had none): ${r.inferredMovies ?? 0} movies, ${r.inferredSeries ?? 0} series.`
          : null,
        r.inferCastRequested && r.inferCastSkipped ? "AI cast skipped: configure GROQ_API_KEY or Ollama." : null,
      ].filter(Boolean);
      setEnrichMsg(parts.join(" "));
      await load();
    } catch (e) {
      setEnrichMsg(e instanceof Error ? e.message : "Enrich failed");
    } finally {
      setEnriching(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !data && !err)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em" }}>LOADING…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: FF.sans, color: "#e8e0d0" }}>
      <header
        style={{
          borderBottom: "1px solid #181818",
          padding: "28px clamp(20px, 4vw, 40px) 22px",
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "#e50914",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  fontFamily: FF.mono,
                  fontWeight: 500,
                }}
              >
                Analytics
              </p>
              <h1
                style={{
                  fontFamily: FF.display,
                  fontSize: "clamp(22px, 5vw, 36px)",
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  margin: 0,
                  color: "#f5f0e8",
                }}
              >
                Your viewing stats
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                ← Library
              </Link>
              <Link
                href="/what-to-watch"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                What to watch?
              </Link>
              <Link
                href="/watchlist"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Watch next
              </Link>
              <Link
                href="/profile"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  background: "none",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#9a9a9a",
                  padding: "8px 14px",
                  fontSize: 11,
                  fontFamily: FF.mono,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#555", maxWidth: 620, lineHeight: 1.5 }}>
            Refresh pulls runtime, genres, and cast from TMDB. If a row has no TMDB id, we try to match by title (and year).
            When TMDB still has no cast, we automatically try AI-assisted cast matching (configure GROQ_API_KEY or Ollama — results
            can be imperfect; verify on TMDB).
          </p>
          <button
            type="button"
            onClick={runEnrich}
            disabled={enriching}
            style={{
              marginTop: 12,
              background: enriching ? "#222" : "#1a1a1a",
              border: "1px solid #444",
              borderRadius: 6,
              color: enriching ? "#666" : "#c8c4ba",
              padding: "8px 16px",
              fontSize: 11,
              fontFamily: FF.mono,
              letterSpacing: "0.06em",
              cursor: enriching ? "wait" : "pointer",
            }}
          >
            {enriching ? "Refreshing…" : "Refresh from TMDB"}
          </button>
          {enrichMsg && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#7a756c" }}>{enrichMsg}</p>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px clamp(16px, 4vw, 40px) 80px" }}>
        {err && <p style={{ color: "#c44" }}>{err}</p>}
        {data && (
          <div style={{ display: "grid", gap: 28 }}>
            <section
              style={{
                background: "#111",
                border: "1px solid #1f1f1f",
                borderRadius: 12,
                padding: "22px 24px",
              }}
            >
              <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 12px" }}>
                TOTAL TIME
              </h2>
              <p style={{ fontSize: "clamp(28px, 6vw, 42px)", fontFamily: FF.display, margin: 0, color: "#f5f0e8" }}>
                {formatMinutes(data.totalMinutesWatched)}
              </p>
              <p style={{ fontSize: 12, color: "#666", margin: "10px 0 0" }}>
                Movies: {formatMinutes(data.movieMinutes)} · Series (est.): {formatMinutes(data.seriesMinutes)}
              </p>
            </section>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <RankedList
                title="Top actors / actresses"
                subtitle={
                  data.metaHints.entriesWithInferredCast > 0
                    ? "Only the top 3 billed leads per title (TMDB order). Some titles used AI for those 3 — approximate."
                    : "Only the top 3 billed leads per title (TMDB billing order), not the full cast list."
                }
                empty="No cast data yet. Click Refresh from TMDB (optionally enable AI for stubborn rows)."
                items={data.topActors}
              />
              <RankedList title="Top 5 rated movies" empty="Rate some movies." items={data.topMovies} isMovie />
              <RankedList title="Top 5 rated series" empty="Rate some series." items={data.topSeries} />
            </div>

            {(data.metaHints.moviesMissingRuntime > 0 ||
              data.metaHints.seriesMissingRuntime > 0 ||
              data.metaHints.entriesMissingCast > 0) && (
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                Hint: {data.metaHints.moviesMissingRuntime} movies missing runtime,{" "}
                {data.metaHints.seriesMissingRuntime} series missing episode length,{" "}
                {data.metaHints.entriesMissingCast} entries missing cast — use Refresh from TMDB if you use TMDB search when adding.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function RankedList({ title, subtitle, empty, items, isMovie }) {
  if (!items?.length) {
    return (
      <section style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "20px 22px" }}>
        <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 8px" }}>{title}</h2>
        <p style={{ color: "#444", fontSize: 13, margin: 0 }}>{empty}</p>
      </section>
    );
  }

  return (
    <section style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "20px 22px" }}>
      <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 4px" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 11, color: "#555", margin: "0 0 14px" }}>{subtitle}</p>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((row, i) => (
          <li
            key={row.id || row.name || i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingBottom: 12,
              borderBottom: i < items.length - 1 ? "1px solid #1a1a1a" : "none",
            }}
          >
            {row.count != null && row.profilePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faceSrc(row.profilePath)}
                alt=""
                width={44}
                height={44}
                style={{ objectFit: "cover", borderRadius: "50%", flexShrink: 0, border: "1px solid #2a2a2a" }}
              />
            ) : row.posterPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterSrc(row.posterPath)} alt="" width={40} height={60} style={{ objectFit: "cover", borderRadius: 4 }} />
            ) : (
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#1f1f1f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FF.mono,
                  fontSize: 14,
                  color: "#666",
                  flexShrink: 0,
                }}
              >
                {row.count != null ? row.name?.slice(0, 1)?.toUpperCase() ?? "?" : String(i + 1).padStart(2, "0")}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#d8d4cc", fontWeight: 500 }}>
                {row.count != null ? row.name : row.title}
              </p>
              {row.count != null && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666", fontFamily: FF.mono }}>
                  {row.count} title{row.count === 1 ? "" : "s"}
                </p>
              )}
              {row.userRating != null && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#888", fontFamily: FF.mono }}>
                  Your rating: {row.userRating}/10
                  {isMovie && row.year != null && ` · ${row.year}`}
                  {!isMovie && row.years && ` · ${row.years}`}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
