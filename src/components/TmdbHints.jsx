"use client";

import { useState, useEffect } from "react";
import { FF } from "@/lib/fonts";
import { apiJson } from "@/lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function findLibraryMovie(movies, r) {
  if (!movies?.length) return null;
  const byTmdb = movies.find((m) => m.tmdbId != null && Number(m.tmdbId) === Number(r.tmdbId));
  if (byTmdb) return byTmdb;
  const t = (r.title || "").trim().toLowerCase();
  const y = r.year;
  if (!t) return null;
  return movies.find((m) => m.title.trim().toLowerCase() === t && (y == null || m.year === y)) || null;
}

export default function TmdbHints({
  query,
  type,
  onPick,
  onOpenDetail,
  visible,
  libraryMovies = [],
  onQuickAdd,
  quickAddBusyTmdbId = null,
  positionDropdown = "flow",
  /** Higher when anchored in fixed header (dropdown above page content). */
  dropdownZIndex = 40,
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
          zIndex: dropdownZIndex,
          margin: 0,
        }
      : { margin: "8px 0 0" };

  return (
    <ul
      className="tmdb-search-hints"
      style={{
        listStyle: "none",
        padding: 0,
        maxHeight: 320,
        overflowY: "auto",
        overflowX: "hidden",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        background: "#111",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        colorScheme: "dark",
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
              alignItems: "flex-start",
              gap: 12,
              padding: "8px 10px",
              minWidth: 0,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onPick(r);
                onOpenDetail?.(r);
              }}
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                textAlign: "left",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
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
                <img
                  src={posterSrc(r.posterPath)}
                  alt=""
                  width={36}
                  height={54}
                  style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <span
                style={{
                  flex: "1 1 0%",
                  minWidth: 0,
                  lineHeight: 1.35,
                  overflowWrap: "break-word",
                  wordBreak: "normal",
                }}
              >
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
                  flex: "0 0 auto",
                  flexShrink: 0,
                  minWidth: "min-content",
                  maxWidth: "100%",
                  alignSelf: "flex-start",
                  paddingTop: 2,
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
