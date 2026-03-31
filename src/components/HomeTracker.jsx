"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";
import MovieChat from "@/components/MovieChat";
import NetflixImportPanel from "@/components/NetflixImportPanel";
import RecommendationsRow from "@/components/RecommendationsRow";
import WhatToWatchModal from "@/components/WhatToWatchModal";
import RecommendationDetailModal from "@/components/RecommendationDetailModal";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

const YEARS = Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i);

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
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

function RatingOutOfTen({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="rating-o10" role="group" aria-label="Your rating out of 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-o10__btn ${n <= active ? "rating-o10__btn--on" : ""}`}
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          title={`${n}/10 — click again to clear`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const inputStyle = {
  background: "#0f0f0f",
  border: "1px solid #2a2a2a",
  color: "#e8e0d0",
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FF.sans,
  fontWeight: 400,
  outline: "none",
  letterSpacing: "0.01em",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23555'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: 28,
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Match a TMDB search row to a saved movie (tmdbId first, then title + year). */
function findLibraryMovie(movies, r) {
  if (!movies?.length) return null;
  const byTmdb = movies.find((m) => m.tmdbId != null && Number(m.tmdbId) === Number(r.tmdbId));
  if (byTmdb) return byTmdb;
  const t = (r.title || "").trim().toLowerCase();
  const y = r.year;
  if (!t) return null;
  return movies.find((m) => m.title.trim().toLowerCase() === t && (y == null || m.year === y)) || null;
}

function TmdbHints({
  query,
  type,
  onPick,
  /** Optional: open detail modal (e.g. same as recommendation cards) when the row is clicked. */
  onOpenDetail,
  visible,
  libraryMovies = [],
  onQuickAdd,
  quickAddBusyTmdbId = null,
  /** "absolute" = overlay below parent (toolbar); default stacks in document flow (add form). */
  positionDropdown = "flow",
}) {
  const q = useDebounced(query, 280);
  const [items, setItems] = useState([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!visible || q.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${type}`);
        if (cancelled) return;
        setItems(data.results || []);
        setConfigured(data.configured !== false);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, type, visible]);

  if (!visible || q.length < 2 || items.length === 0) {
    if (visible && q.length >= 2 && !configured) {
      return (
        <p style={{ fontSize: 12, color: "#665", margin: "8px 0 0", fontFamily: FF.sans, lineHeight: 1.4 }}>
          Add TMDB_API_KEY to show search results from The Movie Database.
        </p>
      );
    }
    return null;
  }

  const isMovie = type === "movie";
  const showLibrary = isMovie && Array.isArray(libraryMovies);
  const quickAddEnabled = showLibrary && typeof onQuickAdd === "function";

  const dropPos =
    positionDropdown === "absolute"
      ? {
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(100% + 6px)",
          zIndex: 40,
          margin: 0,
        }
      : { margin: "8px 0 0" };

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        maxHeight: 320,
        overflowY: "auto",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        background: "#111",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        ...dropPos,
      }}
    >
      {items.map((r) => {
        const lib = showLibrary ? findLibraryMovie(libraryMovies, r) : null;
        const busy = quickAddBusyTmdbId != null && quickAddBusyTmdbId === r.tmdbId;
        return (
          <li
            key={`${r.tmdbId}`}
            style={{
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onPick(r);
                onOpenDetail?.(r);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: 0,
                border: "none",
                background: "transparent",
                color: "#c8c4ba",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FF.sans,
              }}
            >
              {r.posterPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterSrc(r.posterPath)} alt="" width={36} height={54} style={{ objectFit: "cover", borderRadius: 4 }} />
              )}
              <span style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
                {r.title}
                {r.year != null && <span style={{ color: "#8a8580", marginLeft: 8 }}>({r.year})</span>}
                {typeof r.voteAverage === "number" && (
                  <span style={{ color: "#7a8a9a", marginLeft: 8 }}>★ {r.voteAverage.toFixed(1)}</span>
                )}
              </span>
            </button>
            {showLibrary && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  flexShrink: 0,
                  maxWidth: 132,
                }}
              >
                {lib ? (
                  <>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        fontFamily: FF.mono,
                        color: "#e50914",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      Watched
                    </span>
                    <span style={{ fontSize: 13, fontFamily: FF.sans, color: "#f5f0e8", fontWeight: 500 }}>
                      {lib.userRating != null ? `${lib.userRating}/10` : "Not rated"}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        fontFamily: FF.mono,
                        color: "#666",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      Not watched
                    </span>
                    {quickAddEnabled && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(r);
                        }}
                        style={{
                          background: busy ? "#2a2a2a" : "rgba(229, 9, 20, 0.15)",
                          border: "1px solid #8b1538",
                          borderRadius: 6,
                          color: busy ? "#555" : "#f5f0e8",
                          padding: "6px 10px",
                          fontSize: 10,
                          fontFamily: FF.mono,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          cursor: busy ? "wait" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {busy ? "…" : "Add to my list"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddForm({
  type,
  onAdd,
  onCancel,
  libraryMovies = [],
  onQuickAddMovie,
  quickAddBusyTmdbId = null,
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(2024);
  const [yearEnd, setYearEnd] = useState("present");
  const [eps, setEps] = useState("");
  const [tmdbId, setTmdbId] = useState(null);
  const [error, setError] = useState("");
  const titleRef = useRef(null);
  const showHints = title.trim().length >= 2;

  const handlePick = (r) => {
    setTitle(r.title);
    if (type === "movie" && r.year != null) setYear(r.year);
    if (type === "series" && r.year != null) setYear(r.year);
    setTmdbId(r.tmdbId);
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      if (type === "movie") {
        await onAdd({
          title: title.trim(),
          year: Number(year),
          tmdbId: tmdbId || undefined,
        });
      } else {
        const yearsStr =
          yearEnd === "present"
            ? `${year}–present`
            : yearEnd === String(year)
              ? `${year}`
              : `${year}–${yearEnd}`;
        await onAdd({
          title: title.trim(),
          years: yearsStr,
          eps: eps ? Number(eps) : null,
          tmdbId: tmdbId || undefined,
        });
      }
      setTitle("");
      setYear(2024);
      setYearEnd("present");
      setEps("");
      setTmdbId(null);
      setError("");
      titleRef.current?.focus();
    } catch (e) {
      setError(e.message || "Could not add.");
    }
  };

  return (
    <div
      className="tracker-add-form-animate"
      style={{
        background: "#0d0d0d",
        border: "1px solid #252525",
        borderRadius: 8,
        padding: "20px 22px",
        marginBottom: 24,
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: "#e50914",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: FF.mono,
          fontWeight: 500,
          margin: "0 0 16px",
        }}
      >
        + Add {type === "movie" ? "Movie" : "Series"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          ref={titleRef}
          placeholder={`${type === "movie" ? "Movie" : "Series"} title (search TMDB)…`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTmdbId(null);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={inputStyle}
        />
        <TmdbHints
          query={title}
          type={type === "movie" ? "movie" : "tv"}
          onPick={handlePick}
          visible={showHints}
          libraryMovies={type === "movie" ? libraryMovies : []}
          onQuickAdd={type === "movie" ? onQuickAddMovie : undefined}
          quickAddBusyTmdbId={quickAddBusyTmdbId}
        />
        {type === "movie" && tmdbId != null ? (
          <div>
            <p
              style={{
                fontSize: 10,
                color: "#555",
                letterSpacing: "0.1em",
                fontFamily: FF.mono,
                fontWeight: 500,
                margin: "0 0 6px",
              }}
            >
              RELEASE YEAR
              <span style={{ color: "#e50914", marginLeft: 8, letterSpacing: "0.06em" }}>· TMDB</span>
            </p>
            <div
              style={{
                ...selectStyle,
                cursor: "default",
                opacity: 0.92,
                display: "flex",
                alignItems: "center",
              }}
            >
              {year}
            </div>
            <p style={{ fontSize: 11, color: "#555", fontFamily: FF.sans, margin: "10px 0 0", lineHeight: 1.4 }}>
              Year comes from The Movie Database. Change the title to pick a different result or add manually without TMDB.
            </p>
          </div>
        ) : type === "series" && tmdbId != null ? (
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "#e50914",
                letterSpacing: "0.12em",
                fontFamily: FF.mono,
                fontWeight: 500,
                margin: "0 0 8px",
              }}
            >
              DATES & EPISODES · TMDB
            </p>
            <p style={{ fontSize: 13, color: "#9a9a9a", fontFamily: FF.sans, margin: 0, lineHeight: 1.5 }}>
              Run years and episode count are set from The Movie Database when you add this series. To set them by hand,
              clear the title and type a new one without choosing a TMDB match.
            </p>
          </div>
        ) : (
          <div className="tracker-form-row">
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 10,
                  color: "#555",
                  letterSpacing: "0.1em",
                  fontFamily: FF.mono,
                  fontWeight: 500,
                  margin: "0 0 6px",
                }}
              >
                {type === "movie" ? "RELEASE YEAR" : "START YEAR"}
              </p>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {type === "series" && (
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 10,
                    color: "#555",
                    letterSpacing: "0.1em",
                    fontFamily: FF.mono,
                    fontWeight: 500,
                    margin: "0 0 6px",
                  }}
                >
                  END YEAR
                </p>
                <select value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} style={selectStyle}>
                  <option value="present">present</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {type === "series" && (
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 10,
                    color: "#555",
                    letterSpacing: "0.1em",
                    fontFamily: FF.mono,
                    fontWeight: 500,
                    margin: "0 0 6px",
                  }}
                >
                  EPISODES (OPT.)
                </p>
                <input
                  type="number"
                  placeholder="—"
                  value={eps}
                  onChange={(e) => setEps(e.target.value)}
                  style={inputStyle}
                  min={1}
                />
              </div>
            )}
          </div>
        )}
        {error && (
          <p style={{ fontSize: 13, color: "#e50914", fontFamily: FF.sans, margin: 0 }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              color: "#9a9a9a",
              padding: "10px 18px",
              fontSize: 12,
              fontFamily: FF.mono,
              fontWeight: 500,
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              background: "#e50914",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              padding: "10px 22px",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: FF.mono,
              fontWeight: 600,
              transition: "background 0.15s ease, transform 0.1s ease",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

const colLabel = (label, right) => (
  <span
    style={{
      fontSize: 10,
      color: "#4a4a4a",
      letterSpacing: "0.12em",
      fontFamily: FF.mono,
      fontWeight: 500,
      textAlign: right ? "right" : "left",
    }}
  >
    {label}
  </span>
);

const colLabelYou = () => (
  <span
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 2,
      fontSize: 10,
      color: "#4a4a4a",
      letterSpacing: "0.12em",
      fontFamily: FF.mono,
      fontWeight: 500,
      lineHeight: 1.1,
    }}
  >
    <span>YOU</span>
    <span style={{ fontSize: 8, letterSpacing: "0.1em", color: "#3a3a3a" }}>/10</span>
  </span>
);

export default function HomeTracker() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [flash, setFlash] = useState(null);
  const [wtwOpen, setWtwOpen] = useState(false);
  const [searchDetailModal, setSearchDetailModal] = useState(null);
  const [quickAddBusyTmdbId, setQuickAddBusyTmdbId] = useState(null);
  const [profileCard, setProfileCard] = useState(null);

  const showFlash = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }, []);

  const refreshAll = useCallback(async () => {
    const [m, s] = await Promise.all([apiJson("/api/movies"), apiJson("/api/series")]);
    setMovies(m);
    setSeries(s);
    try {
      const p = await apiJson("/api/profile");
      setProfileCard(p);
    } catch {
      setProfileCard(null);
    }
  }, []);

  const bumpProfile = useCallback(async () => {
    try {
      const p = await apiJson("/api/profile");
      setProfileCard(p);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setProfileCard(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshAll();
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, refreshAll]);

  const createMovieEntry = useCallback(async (item) => {
    const created = await apiJson("/api/movies", {
      method: "POST",
      body: JSON.stringify(item),
    });
    setMovies((prev) => [...prev, created].sort((a, b) => a.year - b.year));
    bumpProfile();
    return created;
  }, [bumpProfile]);

  const addMovie = useCallback(
    async (item) => {
      const created = await createMovieEntry(item);
      showFlash(`"${created.title}" added to Movies`);
      setShowMovieForm(false);
    },
    [createMovieEntry, showFlash]
  );

  const quickAddMovieFromSearch = useCallback(
    async (r) => {
      const y = r.year;
      if (y == null || !Number.isFinite(y)) {
        showFlash("No release year from TMDB — use Add Movie to set the year.");
        return;
      }
      setQuickAddBusyTmdbId(r.tmdbId);
      try {
        const created = await createMovieEntry({
          title: r.title,
          year: y,
          tmdbId: r.tmdbId,
        });
        showFlash(`"${created.title}" added to Movies`);
        setShowMovieForm(false);
      } catch (e) {
        showFlash(e instanceof Error ? e.message : "Could not add movie");
      } finally {
        setQuickAddBusyTmdbId(null);
      }
    },
    [createMovieEntry, showFlash]
  );

  const addSeries = async (item) => {
    const created = await apiJson("/api/series", {
      method: "POST",
      body: JSON.stringify(item),
    });
    setSeries((prev) => {
      const next = [...prev, created];
      return next.sort((a, b) => parseInt(a.years, 10) - parseInt(b.years, 10));
    });
    showFlash(`"${created.title}" added to Series`);
    setShowSeriesForm(false);
    bumpProfile();
  };

  const removeMovie = async (id) => {
    await apiJson(`/api/movies/${id}`, { method: "DELETE" });
    setMovies((prev) => prev.filter((m) => m.id !== id));
    bumpProfile();
  };

  const removeSeries = async (id) => {
    await apiJson(`/api/series/${id}`, { method: "DELETE" });
    setSeries((prev) => prev.filter((s) => s.id !== id));
    bumpProfile();
  };

  const setMovieRating = async (id, v) => {
    const updated = await apiJson(`/api/movies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ userRating: v }),
    });
    setMovies((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const setSeriesRating = async (id, v) => {
    const updated = await apiJson(`/api/series/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ userRating: v }),
    });
    setSeries((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const sortedMovies = [...movies].sort((a, b) => a.year - b.year);
  const sortedSeries = [...series].sort((a, b) => parseInt(a.years, 10) - parseInt(b.years, 10));
  const filteredMovies = sortedMovies.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  const filteredSeries = sortedSeries.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  if (status === "loading" || (status === "authenticated" && loading)) {
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
        <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em", fontWeight: 500 }}>
          LOADING…
        </p>
      </div>
    );
  }

  return (
    <div className="tracker-page-animate" style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: FF.sans, color: "#e8e0d0" }}>
      {wtwOpen && <WhatToWatchModal onClose={() => setWtwOpen(false)} />}
      {searchDetailModal && (
        <RecommendationDetailModal item={searchDetailModal} onClose={() => setSearchDetailModal(null)} />
      )}
      <div
        className="tracker-header-animate"
        style={{
          borderBottom: "1px solid #181818",
          padding: "28px clamp(20px, 4vw, 40px) 22px",
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          overflow: "visible",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", overflow: "visible" }}>
          <div className="tracker-header-top">
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
                Netflix Viewing History
              </p>
              <h1
                style={{
                  fontFamily: FF.sans,
                  fontSize: "clamp(20px, 5.5vw, 40px)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1.12,
                  color: "#f5f0e8",
                }}
              >
                All Titles
              </h1>
            </div>
            <div className="tracker-user-bar" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 12,
                  color: "#6a6a6a",
                  fontFamily: FF.sans,
                  fontWeight: 500,
                  maxWidth: 240,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={session?.user?.email}
              >
                {session?.user?.email}
              </span>
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
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="tracker-toolbar">
            <div className="tracker-toolbar-inner">
              <Link
                href="/watchlist"
                style={{
                  fontSize: 12,
                  fontFamily: FF.sans,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: "#c8c4ba",
                  textDecoration: "none",
                  border: "1px solid #444",
                  padding: "8px 14px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                Watch next
              </Link>
              <button
                type="button"
                onClick={() => setWtwOpen(true)}
                style={{
                  fontSize: 12,
                  fontFamily: FF.sans,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: "#c8c4ba",
                  background: "transparent",
                  border: "1px solid #444",
                  padding: "8px 14px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                What to watch?
              </button>
              <Link
                href="/analytics"
                style={{
                  fontSize: 12,
                  fontFamily: FF.sans,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: "#c8c4ba",
                  textDecoration: "none",
                  border: "1px solid #444",
                  padding: "8px 14px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                Analytics
              </Link>
              <Link
                href="/profile"
                style={{
                  fontSize: 12,
                  fontFamily: FF.sans,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: "#c8c4ba",
                  textDecoration: "none",
                  border: "1px solid #444",
                  padding: "8px 14px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                Profile
              </Link>
              {profileCard?.preferences?.showBadgesOnHome !== false && profileCard?.watchSummary?.currentBadge && (
                <Link
                  href="/profile"
                  title="Your watch-time rank"
                  style={{
                    fontSize: 10,
                    fontFamily: FF.mono,
                    letterSpacing: "0.1em",
                    color: "#a08070",
                    textDecoration: "none",
                    border: "1px solid #3a3028",
                    padding: "8px 12px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profileCard.watchSummary.currentBadge.title}
                </Link>
              )}
              <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: FF.mono, letterSpacing: "0.1em" }}>
                ☁ saved to your account
              </span>
              <div
                className="tracker-search-input"
                style={{ position: "relative", zIndex: 12, minWidth: 0, flex: 1, maxWidth: 360 }}
              >
                <input
                  placeholder="Search movies (TMDB) or filter your list…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search movies and your library"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#141414",
                    border: "1px solid rgba(180, 20, 40, 0.9)",
                    borderRadius: 8,
                    color: "#e8e0d0",
                    padding: "10px 14px",
                    fontSize: 13,
                    fontFamily: FF.sans,
                    outline: "none",
                    letterSpacing: "0.02em",
                    boxShadow: "0 0 0 1px rgba(90, 0, 0, 0.35)",
                  }}
                />
                <TmdbHints
                  query={search}
                  type="movie"
                  onPick={(r) => setSearch(r.title)}
                  onOpenDetail={(r) => setSearchDetailModal({ tmdbId: r.tmdbId, mediaType: "movie" })}
                  visible={search.trim().length >= 2}
                  libraryMovies={movies}
                  onQuickAdd={quickAddMovieFromSearch}
                  quickAddBusyTmdbId={quickAddBusyTmdbId}
                  positionDropdown="absolute"
                />
              </div>
            </div>
          </div>
          <div className="tracker-tabs">
            {[
              { key: "all", label: "All" },
              { key: "movies", label: `Movies (${movies.length})` },
              { key: "series", label: `Series (${series.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tracker-tab ${filter === tab.key ? "tracker-tab--active" : ""}`}
                onClick={() => setFilter(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: filter === tab.key ? "2px solid #e50914" : "2px solid transparent",
                  color: filter === tab.key ? "#f5f0e8" : "#555",
                  padding: "10px 18px",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: FF.mono,
                  fontWeight: filter === tab.key ? 500 : 400,
                  transition: "color 0.18s ease, border-color 0.18s ease",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <NetflixImportPanel onImported={refreshAll} />
        </div>
      </div>

      {flash && (
        <div
          className="tracker-toast tracker-toast-animate"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 10,
            color: "#c8c4ba",
            padding: "12px 22px",
            fontSize: 13,
            fontFamily: FF.sans,
            letterSpacing: "0.02em",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          ✓ {flash}
        </div>
      )}

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px) max(88px, env(safe-area-inset-bottom))" }}>
        <RecommendationsRow />
        <div className={`tracker-main-grid ${filter === "all" ? "tracker-main-grid--split" : "tracker-main-grid--single"}`}>
          {(filter === "all" || filter === "movies") && (
            <div
              className={filter === "all" ? "tracker-movies-col--split" : undefined}
              style={{
                borderRight: filter === "all" ? "1px solid #181818" : "none",
                paddingRight: filter === "all" ? 32 : 0,
              }}
            >
              <div className="tracker-section-head" style={{ padding: "20px 0 14px" }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "#e50914",
                    textTransform: "uppercase",
                    fontFamily: FF.mono,
                    fontWeight: 500,
                  }}
                >
                  ◆ Movies
                </span>
                <span style={{ fontSize: 11, color: "#4a4a4a", fontFamily: FF.sans }}>
                  {filteredMovies.length} titles
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowMovieForm((v) => !v);
                    setShowSeriesForm(false);
                  }}
                  style={{
                    marginLeft: "auto",
                    background: showMovieForm ? "#1a1a1a" : "none",
                    border: "1px solid #333",
                    borderRadius: 6,
                    color: showMovieForm ? "#e50914" : "#666",
                    padding: "6px 14px",
                    fontSize: 11,
                    fontFamily: FF.mono,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  {showMovieForm ? "✕ Close" : "+ Add Movie"}
                </button>
              </div>

              {showMovieForm && (
                <AddForm
                  type="movie"
                  onAdd={addMovie}
                  onCancel={() => setShowMovieForm(false)}
                  libraryMovies={movies}
                  onQuickAddMovie={quickAddMovieFromSearch}
                  quickAddBusyTmdbId={quickAddBusyTmdbId}
                />
              )}

              <div className="tracker-table-scroll">
                <div className="tracker-movie-grid tracker-movie-grid--head">
                  <span />
                  {colLabel("#")}
                  {colLabel("TITLE")}
                  {colLabel("YEAR", true)}
                  {colLabelYou()}
                  {colLabel("TMDB", true)}
                  <span />
                </div>
                {filteredMovies.map((m, i) => (
                  <div
                    key={m.id}
                    className="tracker-row tracker-movie-grid tracker-row-animate"
                    style={{
                      padding: "9px 6px",
                      margin: "0 -6px",
                      borderRadius: 6,
                      borderBottom: "1px solid #0f0f0f",
                    }}
                  >
                  <div style={{ width: 36 }}>
                    {m.posterPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterSrc(m.posterPath)}
                        alt=""
                        width={32}
                        height={48}
                        style={{ objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: FF.mono, fontWeight: 500 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    title={m.overview || m.title}
                    style={{
                      fontSize: 14,
                      fontFamily: FF.sans,
                      fontWeight: 400,
                      color: "#d8d4cc",
                      lineHeight: 1.45,
                      paddingRight: 8,
                    }}
                  >
                    {m.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: FF.mono, textAlign: "right" }}>
                    {m.year}
                  </span>
                  <RatingOutOfTen value={m.userRating || 0} onChange={(v) => setMovieRating(m.id, v)} />
                  <span style={{ fontSize: 10, color: "#444", fontFamily: FF.mono, textAlign: "right" }}>
                    {m.voteAverage != null ? m.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMovie(m.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      borderRadius: 4,
                      color: "#3a3a3a",
                      cursor: "pointer",
                      fontSize: 20,
                      lineHeight: 1,
                      padding: "4px 6px",
                      transition: "color 0.15s ease",
                    }}
                  >
                    ×
                  </button>
                </div>
                ))}
                {filteredMovies.length === 0 && (
                  <p style={{ color: "#444", fontSize: 13, fontFamily: FF.sans, padding: "24px 0" }}>No results.</p>
                )}
              </div>
            </div>
          )}

          {(filter === "all" || filter === "series") && (
            <div
              className={filter === "all" ? "tracker-series-col--stacked" : undefined}
              style={{ paddingLeft: filter === "all" ? 32 : 0 }}
            >
              <div className="tracker-section-head" style={{ padding: "20px 0 14px" }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "#e50914",
                    textTransform: "uppercase",
                    fontFamily: FF.mono,
                    fontWeight: 500,
                  }}
                >
                  ◆ Series
                </span>
                <span style={{ fontSize: 11, color: "#4a4a4a", fontFamily: FF.sans }}>
                  {filteredSeries.length} titles
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowSeriesForm((v) => !v);
                    setShowMovieForm(false);
                  }}
                  style={{
                    marginLeft: "auto",
                    background: showSeriesForm ? "#1a1a1a" : "none",
                    border: "1px solid #333",
                    borderRadius: 6,
                    color: showSeriesForm ? "#e50914" : "#666",
                    padding: "6px 14px",
                    fontSize: 11,
                    fontFamily: FF.mono,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  {showSeriesForm ? "✕ Close" : "+ Add Series"}
                </button>
              </div>

              {showSeriesForm && (
                <AddForm type="series" onAdd={addSeries} onCancel={() => setShowSeriesForm(false)} />
              )}

              <div className="tracker-table-scroll">
                <div className="tracker-series-grid tracker-series-grid--head">
                  <span />
                  {colLabel("#")}
                  {colLabel("TITLE")}
                  {colLabel("YEARS", true)}
                  {colLabel("EP", true)}
                {colLabelYou()}
                {colLabel("TMDB", true)}
                <span />
              </div>
                {filteredSeries.map((s, i) => (
                  <div
                    key={s.id}
                    className="tracker-row tracker-series-grid tracker-row-animate"
                    style={{
                      padding: "9px 6px",
                      margin: "0 -6px",
                      borderRadius: 6,
                      borderBottom: "1px solid #0f0f0f",
                    }}
                  >
                  <div style={{ width: 36 }}>
                    {s.posterPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterSrc(s.posterPath)}
                        alt=""
                        width={32}
                        height={48}
                        style={{ objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: FF.mono, fontWeight: 500 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    title={s.overview || s.title}
                    style={{
                      fontSize: 14,
                      fontFamily: FF.sans,
                      fontWeight: 400,
                      color: "#d8d4cc",
                      lineHeight: 1.45,
                      paddingRight: 8,
                    }}
                  >
                    {s.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: FF.mono, textAlign: "right" }}>
                    {s.years}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: s.eps ? "#777" : "#252525",
                      fontFamily: FF.mono,
                      textAlign: "right",
                    }}
                  >
                    {s.eps ?? "—"}
                  </span>
                  <RatingOutOfTen value={s.userRating || 0} onChange={(v) => setSeriesRating(s.id, v)} />
                  <span style={{ fontSize: 10, color: "#444", fontFamily: FF.mono, textAlign: "right" }}>
                    {s.voteAverage != null ? s.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSeries(s.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      borderRadius: 4,
                      color: "#3a3a3a",
                      cursor: "pointer",
                      fontSize: 20,
                      lineHeight: 1,
                      padding: "4px 6px",
                      transition: "color 0.15s ease",
                    }}
                  >
                    ×
                  </button>
                </div>
                ))}
                {filteredSeries.length === 0 && (
                  <p style={{ color: "#444", fontSize: 13, fontFamily: FF.sans, padding: "24px 0" }}>No results.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <MovieChat />
    </div>
  );
}
