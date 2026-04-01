"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FF } from "@/lib/fonts";
import { apiJson } from "@/lib/api";
import MovieChat from "@/components/MovieChat";
import TmdbHints from "@/components/TmdbHints";
import BrandLogo from "@/components/BrandLogo";
import RecommendationDetailModal from "@/components/RecommendationDetailModal";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";
/** Sharper posters in library rows (not TMDB hint thumbnails). */
const TMDB_POSTER_ROW = "https://image.tmdb.org/t/p/w185";
const ROW_POSTER_IMG_W = 84;
const ROW_POSTER_IMG_H = 126;
const ROW_POSTER_WRAP_W = 96;

const YEARS = Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i);

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
}

function posterSrcRow(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_POSTER_ROW}${posterPath}`;
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
          onClick={(e) => {
            e.stopPropagation();
            onChange(value === n ? 0 : n);
          }}
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

function AddForm({
  type,
  onAdd,
  onCancel,
  libraryMovies = [],
  librarySeries = [],
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
          librarySeries={type === "series" ? librarySeries : []}
          onQuickAdd={type === "movie" ? onQuickAddMovie : undefined}
          quickAddBusyTmdbId={quickAddBusyTmdbId}
          quickAddLabel="Add movie"
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
      fontSize: 12,
      color: "#8a8580",
      letterSpacing: "0.14em",
      fontFamily: FF.mono,
      fontWeight: 600,
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
      fontSize: 12,
      color: "#8a8580",
      letterSpacing: "0.14em",
      fontFamily: FF.mono,
      fontWeight: 600,
      lineHeight: 1.1,
    }}
  >
    <span>YOU</span>
    <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#5a5550" }}>/10</span>
  </span>
);

/** Sucks up extra row width on desktop so title doesn’t sit miles from year/ratings */
function TrackerGridFiller() {
  return <span className="tracker-grid-filler" aria-hidden="true" />;
}

export default function HomeTracker() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [flash, setFlash] = useState(null);
  const [quickAddBusyTmdbId, setQuickAddBusyTmdbId] = useState(null);
  /** Same detail modal as My List / For You — `{ tmdbId, mediaType }` */
  const [libraryDetailModal, setLibraryDetailModal] = useState(null);
  /** Filter only the watched lists below (not the header TMDB search). */
  const [librarySearch, setLibrarySearch] = useState("");

  const showFlash = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }, []);

  const reloadLibrary = useCallback(async () => {
    const [m, s] = await Promise.all([apiJson("/api/movies"), apiJson("/api/series")]);
    setMovies(m);
    setSeries(s);
  }, []);

  const refreshAll = useCallback(async () => {
    await reloadLibrary();
  }, [reloadLibrary]);

  useEffect(() => {
    const onAppRefresh = () => {
      void reloadLibrary();
    };
    window.addEventListener("rp-app-refresh", onAppRefresh);
    return () => window.removeEventListener("rp-app-refresh", onAppRefresh);
  }, [reloadLibrary]);

  const bumpApp = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rp-app-refresh"));
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
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
    bumpApp();
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
    return created;
  }, [bumpApp]);

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
    bumpApp();
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
  };

  const removeMovie = async (id) => {
    await apiJson(`/api/movies/${id}`, { method: "DELETE" });
    setMovies((prev) => prev.filter((m) => m.id !== id));
    bumpApp();
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
  };

  const removeSeries = async (id) => {
    await apiJson(`/api/series/${id}`, { method: "DELETE" });
    setSeries((prev) => prev.filter((s) => s.id !== id));
    bumpApp();
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
  };

  const setMovieRating = async (id, v) => {
    const updated = await apiJson(`/api/movies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ userRating: v }),
    });
    setMovies((prev) => prev.map((m) => (m.id === id ? updated : m)));
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
  };

  const setSeriesRating = async (id, v) => {
    const updated = await apiJson(`/api/series/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ userRating: v }),
    });
    setSeries((prev) => prev.map((s) => (s.id === id ? updated : s)));
    window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
  };

  const sortedMovies = [...movies].sort((a, b) => a.year - b.year);
  const sortedSeries = [...series].sort((a, b) => parseInt(a.years, 10) - parseInt(b.years, 10));
  const libQ = librarySearch.trim().toLowerCase();
  const displayMovies = libQ
    ? sortedMovies.filter((m) => m.title.toLowerCase().includes(libQ))
    : sortedMovies;
  const displaySeries = libQ
    ? sortedSeries.filter((s) => s.title.toLowerCase().includes(libQ))
    : sortedSeries;
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <BrandLogo size={72} spinning alt="" />
          <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em", fontWeight: 500, margin: 0 }}>
            LOADING…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="tracker-page-animate tracker-root-layout"
      style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: FF.sans, color: "#e8e0d0" }}
    >
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
            zIndex: 160,
            pointerEvents: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          ✓ {flash}
        </div>
      )}

      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "16px clamp(16px, 4vw, 40px) 0",
          borderBottom: "1px solid #181818",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px 16px",
          }}
        >
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
                  color: filter === tab.key ? "#f5f0e8" : "#6a6a6a",
                  padding: "12px 20px",
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  textTransform: "none",
                  cursor: "pointer",
                  fontFamily: FF.sans,
                  fontWeight: filter === tab.key ? 600 : 500,
                  transition: "color 0.18s ease, border-color 0.18s ease",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            className="tracker-library-search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: "1 1 160px",
              minWidth: 0,
              maxWidth: 280,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #2a2a2a",
              background: "#121212",
            }}
          >
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              style={{ width: 14, height: 14, color: "#5c5c5c", flexShrink: 0 }}
              aria-hidden
            />
            <input
              type="search"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Your list…"
              aria-label="Filter movies and series in your library"
              className="tracker-library-search__input"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                border: "none",
                background: "transparent",
                color: "#d8d4cc",
                fontSize: 13,
                fontFamily: FF.sans,
                outline: "none",
                padding: "4px 0",
              }}
            />
            {librarySearch.length > 0 && (
              <button
                type="button"
                aria-label="Clear library filter"
                onClick={() => setLibrarySearch("")}
                style={{
                  flexShrink: 0,
                  border: "none",
                  background: "transparent",
                  color: "#666",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                }}
              >
                <FontAwesomeIcon icon={faXmark} style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px) max(88px, env(safe-area-inset-bottom))" }}>
        <div className="tracker-main-grid tracker-main-grid--single">
          {(filter === "all" || filter === "movies") && (
            <div>
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
                  {libQ ? `${displayMovies.length} match${displayMovies.length === 1 ? "" : "es"}` : `${displayMovies.length} titles`}
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
                  <TrackerGridFiller />
                  {colLabel("YEAR", true)}
                  {colLabelYou()}
                  {colLabel("TMDB", true)}
                  <span />
                </div>
                {displayMovies.map((m, i) => (
                  <div
                    key={m.id}
                    className={`tracker-row tracker-movie-grid tracker-movie-row tracker-row-animate${m.tmdbId ? " tracker-row--tmdb" : ""}`}
                    style={{
                      padding: "10px 8px",
                      margin: "0 -4px",
                      borderRadius: 8,
                      borderBottom: "1px solid #121212",
                      cursor: m.tmdbId ? "pointer" : undefined,
                    }}
                    onClick={
                      m.tmdbId
                        ? () => setLibraryDetailModal({ tmdbId: m.tmdbId, mediaType: "movie" })
                        : undefined
                    }
                    title={m.tmdbId ? "Click row for details (TMDB)" : undefined}
                  >
                  <div
                    className="tracker-row-poster-wrap"
                    style={{ width: ROW_POSTER_WRAP_W, flexShrink: 0 }}
                  >
                    {m.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterSrcRow(m.posterPath)}
                        alt=""
                        width={ROW_POSTER_IMG_W}
                        height={ROW_POSTER_IMG_H}
                        style={{
                          objectFit: "cover",
                          borderRadius: 6,
                          boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                          display: "block",
                          width: ROW_POSTER_IMG_W,
                          height: ROW_POSTER_IMG_H,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: ROW_POSTER_IMG_W,
                          height: ROW_POSTER_IMG_H,
                          borderRadius: 6,
                          background: "#1a1a1a",
                          border: "1px solid #252525",
                        }}
                      />
                    )}
                  </div>
                  <span className="tracker-row-idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tracker-row-title" title={m.overview || m.title}>
                    {m.title}
                  </span>
                  <TrackerGridFiller />
                  <span className="tracker-row-meta tracker-row-meta--right">{m.year}</span>
                  <RatingOutOfTen value={m.userRating || 0} onChange={(v) => setMovieRating(m.id, v)} />
                  <span className="tracker-row-tmdb">
                    {m.voteAverage != null ? m.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMovie(m.id);
                    }}
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
                {displayMovies.length === 0 && (
                  <p style={{ color: "#444", fontSize: 13, fontFamily: FF.sans, padding: "24px 0" }}>
                    {libQ && sortedMovies.length > 0 ? "No movies match this filter." : "No results."}
                  </p>
                )}
              </div>
            </div>
          )}

          {(filter === "all" || filter === "series") && (
            <div className={filter === "all" ? "tracker-series-below-movies" : undefined}>
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
                  {libQ ? `${displaySeries.length} match${displaySeries.length === 1 ? "" : "es"}` : `${displaySeries.length} titles`}
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
                <AddForm
                  type="series"
                  onAdd={addSeries}
                  onCancel={() => setShowSeriesForm(false)}
                  librarySeries={series}
                />
              )}

              <div className="tracker-table-scroll">
                <div className="tracker-series-grid tracker-series-grid--head">
                  <span />
                  {colLabel("#")}
                  {colLabel("TITLE")}
                  <TrackerGridFiller />
                  {colLabel("YEARS", true)}
                  {colLabel("EP", true)}
                  {colLabelYou()}
                  {colLabel("TMDB", true)}
                  <span />
                </div>
                {displaySeries.map((s, i) => (
                  <div
                    key={s.id}
                    className={`tracker-row tracker-series-grid tracker-series-row tracker-row-animate${s.tmdbId ? " tracker-row--tmdb" : ""}`}
                    style={{
                      padding: "10px 8px",
                      margin: "0 -4px",
                      borderRadius: 8,
                      borderBottom: "1px solid #121212",
                      cursor: s.tmdbId ? "pointer" : undefined,
                    }}
                    onClick={
                      s.tmdbId
                        ? () => setLibraryDetailModal({ tmdbId: s.tmdbId, mediaType: "tv" })
                        : undefined
                    }
                    title={s.tmdbId ? "Click row for details (TMDB)" : undefined}
                  >
                  <div
                    className="tracker-row-poster-wrap"
                    style={{ width: ROW_POSTER_WRAP_W, flexShrink: 0 }}
                  >
                    {s.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterSrcRow(s.posterPath)}
                        alt=""
                        width={ROW_POSTER_IMG_W}
                        height={ROW_POSTER_IMG_H}
                        style={{
                          objectFit: "cover",
                          borderRadius: 6,
                          boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                          display: "block",
                          width: ROW_POSTER_IMG_W,
                          height: ROW_POSTER_IMG_H,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: ROW_POSTER_IMG_W,
                          height: ROW_POSTER_IMG_H,
                          borderRadius: 6,
                          background: "#1a1a1a",
                          border: "1px solid #252525",
                        }}
                      />
                    )}
                  </div>
                  <span className="tracker-row-idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tracker-row-title" title={s.overview || s.title}>
                    {s.title}
                  </span>
                  <TrackerGridFiller />
                  <span className="tracker-row-meta tracker-row-meta--right">{s.years}</span>
                  <span
                    className="tracker-row-meta tracker-row-meta--right"
                    style={{ color: s.eps ? "#777" : "#252525" }}
                  >
                    {s.eps ?? "—"}
                  </span>
                  <RatingOutOfTen value={s.userRating || 0} onChange={(v) => setSeriesRating(s.id, v)} />
                  <span className="tracker-row-tmdb">
                    {s.voteAverage != null ? s.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSeries(s.id);
                    }}
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
                {displaySeries.length === 0 && (
                  <p style={{ color: "#444", fontSize: 13, fontFamily: FF.sans, padding: "24px 0" }}>
                    {libQ && sortedSeries.length > 0 ? "No series match this filter." : "No results."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {libraryDetailModal && (
        <RecommendationDetailModal item={libraryDetailModal} onClose={() => setLibraryDetailModal(null)} />
      )}
      <MovieChat />
    </div>
  );
}
