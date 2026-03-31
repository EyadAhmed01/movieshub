"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";
import MovieChat from "@/components/MovieChat";
import RecommendationsRow from "@/components/RecommendationsRow";

const POSTER_SM = "https://image.tmdb.org/t/p/w154";
const POSTER_LG = "https://image.tmdb.org/t/p/w500";

function posterSrc(path, large) {
  if (!path) return null;
  return `${large ? POSTER_LG : POSTER_SM}${path}`;
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

function formatRuntime(detail) {
  if (detail.mediaType === "movie" && detail.runtimeMinutes) {
    const h = Math.floor(detail.runtimeMinutes / 60);
    const m = detail.runtimeMinutes % 60;
    return h ? `${h}h ${m}m` : `${m} min`;
  }
  if (detail.mediaType === "tv" && detail.episodeRuntimeMinutes) {
    return `~${detail.episodeRuntimeMinutes} min / ep`;
  }
  return null;
}

export default function WatchlistBrowse() {
  const { status } = useSession();
  const [searchType, setSearchType] = useState("movie");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [addBusy, setAddBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const loadWatchlist = useCallback(async () => {
    setListLoading(true);
    try {
      const rows = await apiJson("/api/watchlist");
      setWatchlist(Array.isArray(rows) ? rows : []);
    } catch {
      setWatchlist([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadWatchlist();
  }, [status, loadWatchlist]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (debouncedQ.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    (async () => {
      try {
        const data = await apiJson(
          `/api/tmdb/search?q=${encodeURIComponent(debouncedQ)}&type=${searchType}`
        );
        if (!cancelled) setResults(data.results || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, searchType, status]);

  const openDetail = async (tmdbId, type) => {
    setMsg("");
    setDetailLoading(true);
    setDetail(null);
    try {
      const { detail: d } = await apiJson(`/api/tmdb/details?type=${type}&id=${tmdbId}`);
      setDetail(d);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const addToList = async () => {
    if (!detail) return;
    setAddBusy(true);
    setMsg("");
    try {
      await apiJson("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({ tmdbId: detail.tmdbId, mediaType: detail.mediaType }),
      });
      await loadWatchlist();
      setMsg("Added to your list.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAddBusy(false);
    }
  };

  const removeItem = async (id) => {
    try {
      await apiJson(`/api/watchlist/${id}`, { method: "DELETE" });
      setWatchlist((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
  };

  const onList = detail
    ? watchlist.some(
        (w) => w.tmdbId === detail.tmdbId && w.mediaType === detail.mediaType
      )
    : false;

  if (status === "loading" || (status === "authenticated" && listLoading && watchlist.length === 0 && !detail)) {
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
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
                Discover
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
                Watch next
              </h1>
              <p style={{ fontSize: 13, color: "#6a6a6a", margin: "10px 0 0", maxWidth: 520, lineHeight: 1.5 }}>
                Search TMDB, read cast and synopsis, then save titles you plan to watch. Same chat and picks as your tracker.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link
                href="/"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Tracker
              </Link>
              <Link
                href="/what-to-watch"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#c8c4ba",
                  textDecoration: "none",
                  border: "1px solid #4a3030",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                What to watch?
              </Link>
              <Link
                href="/analytics"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Analytics
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#665",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px clamp(20px, 4vw, 40px) 80px" }}>
        <RecommendationsRow />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
            gap: 28,
            marginBottom: 40,
          }}
          className="watchlist-grid"
        >
          <section>
            <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 14px" }}>
              SEARCH
            </h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["movie", "tv"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSearchType(t);
                    setResults([]);
                  }}
                  style={{
                    fontFamily: FF.mono,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: `1px solid ${searchType === t ? "#e50914" : "#2a2a2a"}`,
                    background: searchType === t ? "rgba(229,9,20,0.12)" : "transparent",
                    color: searchType === t ? "#f5f0e8" : "#666",
                    cursor: "pointer",
                  }}
                >
                  {t === "movie" ? "Movies" : "TV"}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type at least 2 characters…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#0f0f0f",
                border: "1px solid #2a2a2a",
                color: "#e8e0d0",
                padding: "12px 14px",
                borderRadius: 8,
                fontFamily: FF.sans,
                fontSize: 14,
                marginBottom: 14,
              }}
            />
            {searchLoading && (
              <p style={{ fontSize: 11, color: "#444", fontFamily: FF.mono }}>Searching…</p>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((r) => (
                <li key={`${searchType}-${r.tmdbId}`}>
                  <button
                    type="button"
                    onClick={() => openDetail(r.tmdbId, searchType)}
                    style={{
                      width: "100%",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #1f1f1f",
                      background: "#111",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 69,
                        flexShrink: 0,
                        background: "#0a0a0a",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      {r.posterPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={posterSrc(r.posterPath, false)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f0ebe3" }}>{r.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666", fontFamily: FF.mono }}>
                        {r.year ?? "—"} · {searchType === "movie" ? "Movie" : "Series"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 14px" }}>
              DETAILS
            </h2>
            {detailLoading && (
              <p style={{ fontSize: 12, color: "#555" }}>Loading full credits and synopsis…</p>
            )}
            {!detailLoading && !detail && (
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                Choose a result to see overview, genres, runtime, and top cast before you commit.
              </p>
            )}
            {detail && (
              <div
                style={{
                  border: "1px solid #222",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#0f0f0f",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: 20 }}>
                  <div style={{ width: 200, flexShrink: 0, margin: "0 auto" }}>
                    {detail.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterSrc(detail.posterPath, true)}
                        alt=""
                        style={{ width: "100%", borderRadius: 8, display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          aspectRatio: "2/3",
                          background: "#1a1a1a",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#444",
                          fontSize: 12,
                        }}
                      >
                        No poster
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontFamily: FF.mono, letterSpacing: "0.14em", color: "#e50914", margin: "0 0 6px" }}>
                      {detail.mediaType === "movie" ? "MOVIE" : "TV SERIES"}
                    </p>
                    <h3 style={{ fontFamily: FF.display, fontSize: 26, fontWeight: 400, margin: "0 0 8px", color: "#faf6f0" }}>
                      {detail.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#8a8a8a", margin: "0 0 12px" }}>
                      {detail.mediaType === "movie"
                        ? detail.year
                        : detail.yearsLabel || detail.year || "—"}
                      {detail.voteAverage != null && ` · TMDB ${detail.voteAverage.toFixed(1)}/10`}
                      {formatRuntime(detail) && ` · ${formatRuntime(detail)}`}
                      {detail.mediaType === "tv" && detail.episodesCount != null && ` · ${detail.episodesCount} eps`}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {(detail.genres || []).map((g) => (
                        <span
                          key={g}
                          style={{
                            fontSize: 10,
                            fontFamily: FF.mono,
                            letterSpacing: "0.06em",
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "1px solid #2a2a2a",
                            color: "#9a9a9a",
                          }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.55, color: "#c8c2b8", margin: "0 0 16px" }}>
                      {detail.overview || "No overview available."}
                    </p>
                    <p style={{ fontSize: 10, fontFamily: FF.mono, letterSpacing: "0.16em", color: "#666", margin: "0 0 8px" }}>
                      CAST
                    </p>
                    <p style={{ fontSize: 13, color: "#a5a09a", lineHeight: 1.5, margin: 0 }}>
                      {(detail.cast || []).map((c) => c.name).join(" · ") || "—"}
                    </p>
                    <div style={{ marginTop: 18 }}>
                      {onList ? (
                        <span style={{ fontSize: 12, color: "#5a8a5a", fontFamily: FF.mono }}>On your list</span>
                      ) : (
                        <button
                          type="button"
                          disabled={addBusy}
                          onClick={addToList}
                          style={{
                            fontFamily: FF.mono,
                            fontSize: 11,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "12px 20px",
                            borderRadius: 8,
                            border: "none",
                            background: "#e50914",
                            color: "#fff",
                            cursor: addBusy ? "wait" : "pointer",
                            opacity: addBusy ? 0.7 : 1,
                          }}
                        >
                          {addBusy ? "Adding…" : "Add to watchlist"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {msg && (
              <p style={{ fontSize: 12, color: msg.includes("Added") ? "#6a9a6a" : "#c44", marginTop: 12 }}>{msg}</p>
            )}
          </section>
        </div>

        <section>
          <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 18px" }}>
            YOUR LIST
          </h2>
          {watchlist.length === 0 ? (
            <p style={{ fontSize: 13, color: "#555" }}>Nothing saved yet — search above and add what you want to watch.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {watchlist.map((w) => (
                <article
                  key={w.id}
                  style={{
                    background: "#111",
                    border: "1px solid #1f1f1f",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ aspectRatio: "2/3", background: "#0a0a0a" }}>
                    {w.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterSrc(w.posterPath, false)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 11 }}>
                        No poster
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: "#eae6e0" }}>{w.title}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 10, color: "#666", fontFamily: FF.mono }}>
                      {w.mediaType === "tv" ? w.yearsLabel || w.year : w.year} · {w.mediaType === "movie" ? "Movie" : "TV"}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(w.id)}
                      style={{
                        marginTop: 10,
                        fontSize: 10,
                        fontFamily: FF.mono,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#966",
                        background: "transparent",
                        border: "1px solid #2a2020",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <MovieChat />
    </div>
  );
}
