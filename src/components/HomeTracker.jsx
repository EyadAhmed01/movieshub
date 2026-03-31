"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

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

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onChange(value === star ? 0 : star);
          }}
          onClick={() => onChange(value === star ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          title={`${star}/5`}
          style={{
            cursor: "pointer",
            fontSize: 15,
            color: star <= (hovered || value) ? "#e50914" : "#222",
            transition: "color 0.1s",
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const inputStyle = {
  background: "#0f0f0f",
  border: "1px solid #252525",
  color: "#d0ccc4",
  padding: "9px 12px",
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
  letterSpacing: "0.04em",
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

function TmdbHints({ query, type, onPick, visible }) {
  const q = useDebounced(query, 400);
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
        <p style={{ fontSize: 10, color: "#664", margin: "6px 0 0", fontFamily: "monospace" }}>
          Add TMDB_API_KEY to show search results from The Movie Database.
        </p>
      );
    }
    return null;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        margin: "8px 0 0",
        padding: 0,
        maxHeight: 200,
        overflowY: "auto",
        border: "1px solid #252525",
        background: "#111",
      }}
    >
      {items.map((r) => (
        <li key={`${r.tmdbId}`}>
          <button
            type="button"
            onClick={() => onPick(r)}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "8px 10px",
              border: "none",
              borderBottom: "1px solid #1a1a1a",
              background: "transparent",
              color: "#c8c4ba",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            {r.posterPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterSrc(r.posterPath)} alt="" width={36} height={54} style={{ objectFit: "cover" }} />
            )}
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              {r.title}
              {r.year != null && (
                <span style={{ color: "#555", marginLeft: 8 }}>({r.year})</span>
              )}
              {typeof r.voteAverage === "number" && (
                <span style={{ color: "#444", marginLeft: 8 }}>★ {r.voteAverage.toFixed(1)}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddForm({ type, onAdd, onCancel }) {
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
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", padding: "18px 20px", marginBottom: 20 }}>
      <p
        style={{
          fontSize: 10,
          color: "#e50914",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          fontFamily: "monospace",
          margin: "0 0 14px",
        }}
      >
        + Add {type === "movie" ? "Movie" : "Series"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        <TmdbHints query={title} type={type === "movie" ? "movie" : "tv"} onPick={handlePick} visible={showHints} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 9,
                color: "#444",
                letterSpacing: "0.15em",
                fontFamily: "monospace",
                margin: "0 0 4px",
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
                  fontSize: 9,
                  color: "#444",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  margin: "0 0 4px",
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
                  fontSize: 9,
                  color: "#444",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  margin: "0 0 4px",
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
        {error && (
          <p style={{ fontSize: 11, color: "#e50914", fontFamily: "monospace", margin: 0 }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#888",
              padding: "9px 16px",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
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
              color: "#fff",
              padding: "9px 20px",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "monospace",
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
      fontSize: 9,
      color: "#333",
      letterSpacing: "0.2em",
      fontFamily: "monospace",
      textAlign: right ? "right" : "left",
    }}
  >
    {label}
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

  const showFlash = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }, []);

  const refreshAll = useCallback(async () => {
    const [m, s] = await Promise.all([apiJson("/api/movies"), apiJson("/api/series")]);
    setMovies(m);
    setSeries(s);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
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

  const addMovie = async (item) => {
    const created = await apiJson("/api/movies", {
      method: "POST",
      body: JSON.stringify(item),
    });
    setMovies((prev) => [...prev, created].sort((a, b) => a.year - b.year));
    showFlash(`"${created.title}" added to Movies`);
    setShowMovieForm(false);
  };

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
  };

  const removeMovie = async (id) => {
    await apiJson(`/api/movies/${id}`, { method: "DELETE" });
    setMovies((prev) => prev.filter((m) => m.id !== id));
  };

  const removeSeries = async (id) => {
    await apiJson(`/api/series/${id}`, { method: "DELETE" });
    setSeries((prev) => prev.filter((s) => s.id !== id));
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
  const ratedCount =
    movies.filter((m) => m.userRating).length + series.filter((s) => s.userRating).length;

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
        <p style={{ color: "#333", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em" }}>LOADING…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Georgia', serif", color: "#e8e0d0" }}>
      <div
        style={{
          borderBottom: "1px solid #181818",
          padding: "32px 40px 24px",
          background: "#0a0a0a",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "#e50914",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontFamily: "monospace",
                }}
              >
                Netflix Viewing History
              </p>
              <h1
                style={{
                  fontSize: "clamp(20px, 3vw, 38px)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1,
                  color: "#f5f0e8",
                }}
              >
                All Titles · Sorted by Year
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
                {session?.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  background: "none",
                  border: "1px solid #333",
                  color: "#888",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "#2a2a2a", fontFamily: "monospace" }}>☁ saved to your account</span>
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #222",
                  color: "#e8e0d0",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  outline: "none",
                  width: 160,
                  letterSpacing: "0.05em",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 18, borderBottom: "1px solid #181818" }}>
            {[
              { key: "all", label: "All" },
              { key: "movies", label: `Movies (${movies.length})` },
              { key: "series", label: `Series (${series.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: filter === tab.key ? "2px solid #e50914" : "2px solid transparent",
                  color: filter === tab.key ? "#f5f0e8" : "#444",
                  padding: "6px 16px",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: "#333",
                fontFamily: "monospace",
                paddingBottom: 7,
              }}
            >
              {ratedCount} / {movies.length + series.length} rated
            </span>
          </div>
        </div>
      </div>

      {flash && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#c8c4ba",
            padding: "10px 20px",
            fontSize: 12,
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          ✓ {flash}
        </div>
      )}

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: filter === "all" ? "1fr 1fr" : "1fr", gap: 0 }}>
          {(filter === "all" || filter === "movies") && (
            <div
              style={{
                borderRight: filter === "all" ? "1px solid #181818" : "none",
                paddingRight: filter === "all" ? 32 : 0,
              }}
            >
              <div style={{ padding: "20px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.3em",
                    color: "#e50914",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                  }}
                >
                  ◆ Movies
                </span>
                <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>
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
                    border: "1px solid #282828",
                    color: showMovieForm ? "#e50914" : "#555",
                    padding: "4px 10px",
                    fontSize: 10,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                  }}
                >
                  {showMovieForm ? "✕ Close" : "+ Add Movie"}
                </button>
              </div>

              {showMovieForm && (
                <AddForm type="movie" onAdd={addMovie} onCancel={() => setShowMovieForm(false)} />
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 36px 1fr 50px 92px 44px 28px",
                  borderBottom: "1px solid #181818",
                  paddingBottom: 6,
                  marginBottom: 2,
                  gap: 4,
                  alignItems: "end",
                }}
              >
                <span />
                {colLabel("#")}
                {colLabel("TITLE")}
                {colLabel("YEAR", true)}
                {colLabel("YOU", true)}
                {colLabel("TMDB", true)}
                <span />
              </div>
              {filteredMovies.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 36px 1fr 50px 92px 44px 28px",
                    padding: "7px 0",
                    borderBottom: "1px solid #0f0f0f",
                    alignItems: "center",
                    gap: 4,
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
                        style={{ objectFit: "cover", borderRadius: 2 }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#282828", fontFamily: "monospace" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    title={m.overview || m.title}
                    style={{ fontSize: 13, color: "#c8c4ba", lineHeight: 1.3, paddingRight: 8 }}
                  >
                    {m.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textAlign: "right" }}>
                    {m.year}
                  </span>
                  <StarRating value={m.userRating || 0} onChange={(v) => setMovieRating(m.id, v)} />
                  <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace", textAlign: "right" }}>
                    {m.voteAverage != null ? m.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMovie(m.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2a2a2a",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "0 0 0 4px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {filteredMovies.length === 0 && (
                <p style={{ color: "#333", fontSize: 12, fontFamily: "monospace", padding: "20px 0" }}>No results.</p>
              )}
            </div>
          )}

          {(filter === "all" || filter === "series") && (
            <div style={{ paddingLeft: filter === "all" ? 32 : 0 }}>
              <div style={{ padding: "20px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.3em",
                    color: "#e50914",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                  }}
                >
                  ◆ Series
                </span>
                <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>
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
                    border: "1px solid #282828",
                    color: showSeriesForm ? "#e50914" : "#555",
                    padding: "4px 10px",
                    fontSize: 10,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                  }}
                >
                  {showSeriesForm ? "✕ Close" : "+ Add Series"}
                </button>
              </div>

              {showSeriesForm && (
                <AddForm type="series" onAdd={addSeries} onCancel={() => setShowSeriesForm(false)} />
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 36px 1fr 62px 36px 92px 44px 28px",
                  borderBottom: "1px solid #181818",
                  paddingBottom: 6,
                  marginBottom: 2,
                  gap: 4,
                  alignItems: "end",
                }}
              >
                <span />
                {colLabel("#")}
                {colLabel("TITLE")}
                {colLabel("YEARS", true)}
                {colLabel("EP", true)}
                {colLabel("YOU", true)}
                {colLabel("TMDB", true)}
                <span />
              </div>
              {filteredSeries.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 36px 1fr 62px 36px 92px 44px 28px",
                    padding: "7px 0",
                    borderBottom: "1px solid #0f0f0f",
                    alignItems: "center",
                    gap: 4,
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
                        style={{ objectFit: "cover", borderRadius: 2 }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#282828", fontFamily: "monospace" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    title={s.overview || s.title}
                    style={{ fontSize: 13, color: "#c8c4ba", lineHeight: 1.3, paddingRight: 8 }}
                  >
                    {s.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textAlign: "right" }}>
                    {s.years}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: s.eps ? "#777" : "#252525",
                      fontFamily: "monospace",
                      textAlign: "right",
                    }}
                  >
                    {s.eps ?? "—"}
                  </span>
                  <StarRating value={s.userRating || 0} onChange={(v) => setSeriesRating(s.id, v)} />
                  <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace", textAlign: "right" }}>
                    {s.voteAverage != null ? s.voteAverage.toFixed(1) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSeries(s.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2a2a2a",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "0 0 0 4px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {filteredSeries.length === 0 && (
                <p style={{ color: "#333", fontSize: 12, fontFamily: "monospace", padding: "20px 0" }}>No results.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
