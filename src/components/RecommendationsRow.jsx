"use client";

import { useEffect, useState, useCallback } from "react";
import { FF } from "@/lib/fonts";
import RecommendationDetailModal from "@/components/RecommendationDetailModal";

const TMDB_IMG = "https://image.tmdb.org/t/p/w154";
const STORAGE_KEY = "tracker-for-you-expanded";

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
}

function RecCard({ x, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(x)}
      title="View details"
      style={{
        flex: "0 0 auto",
        width: 120,
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 10,
        overflow: "hidden",
        textAlign: "left",
        cursor: "pointer",
        color: "inherit",
        padding: 0,
        font: "inherit",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      className="rec-card-link"
    >
      <div style={{ aspectRatio: "2/3", background: "#0a0a0a" }}>
        {x.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterSrc(x.posterPath)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#333",
              fontSize: 11,
            }}
          >
            No poster
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#d0ccc4",
            lineHeight: 1.35,
            fontWeight: 500,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {x.title}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 9, fontFamily: FF.mono, color: "#555", letterSpacing: "0.08em" }}>
          {x.mediaType === "tv" ? "SERIES" : "MOVIE"}
          {x.year != null ? ` · ${x.year}` : ""}
        </p>
      </div>
    </button>
  );
}

function RecStrip({ items, onOpen }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarColor: "#333 #0a0a0a",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((x) => (
        <RecCard key={`${x.mediaType}-${x.tmdbId}`} x={x} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function RecommendationsRow({ variant = "inline" }) {
  const isPage = variant === "page";
  const [movieItems, setMovieItems] = useState([]);
  const [tvItems, setTvItems] = useState([]);
  const [reason, setReason] = useState("");
  const [algorithm, setAlgorithm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (isPage) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "0") setExpanded(false);
    } catch {
      /* ignore */
    }
  }, [isPage]);

  const toggleExpanded = useCallback(() => {
    setExpanded((e) => {
      const n = !e;
      if (!isPage) {
        try {
          localStorage.setItem(STORAGE_KEY, n ? "1" : "0");
        } catch {
          /* ignore */
        }
      }
      return n;
    });
  }, [isPage]);

  const loadRecs = useCallback(async (background) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/recommendations", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const m = Array.isArray(data.movieItems) ? data.movieItems : [];
      const t = Array.isArray(data.tvItems) ? data.tvItems : [];
      if (m.length === 0 && t.length === 0 && Array.isArray(data.items)) {
        const legacy = data.items;
        setMovieItems(legacy.filter((x) => x.mediaType !== "tv"));
        setTvItems(legacy.filter((x) => x.mediaType === "tv"));
      } else {
        setMovieItems(m);
        setTvItems(t);
      }
      setReason(data.reason || "");
      setAlgorithm(data.algorithm || null);
    } catch {
      setMovieItems([]);
      setTvItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecs(false);
  }, [loadRecs]);

  useEffect(() => {
    const onRefresh = () => {
      loadRecs(true);
    };
    window.addEventListener("rp-recommendations-refresh", onRefresh);
    return () => window.removeEventListener("rp-recommendations-refresh", onRefresh);
  }, [loadRecs]);

  const totalPicks = movieItems.length + tvItems.length;
  const hasAny = totalPicks > 0;

  const refreshBtn = isPage ? (
    <button
      type="button"
      onClick={() => loadRecs(true)}
      disabled={refreshing || loading}
      style={{
        flexShrink: 0,
        background: refreshing ? "#2a2a2a" : "#1a1a1a",
        border: "1px solid #3a3a3a",
        borderRadius: 8,
        color: "#c8c4ba",
        fontSize: 11,
        fontFamily: FF.mono,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "10px 16px",
        cursor: refreshing || loading ? "wait" : "pointer",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
    >
      {refreshing ? "Updating…" : "Refresh picks"}
    </button>
  ) : null;

  const headerButton = (
    <button
      type="button"
      onClick={toggleExpanded}
      aria-expanded={expanded}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: "1 1 auto",
        minWidth: 0,
        background: "none",
        border: "none",
        padding: "4px 0",
        cursor: "pointer",
        textAlign: "left",
        color: "inherit",
        font: "inherit",
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 9,
          color: "#666",
          fontFamily: FF.mono,
          width: 14,
          flexShrink: 0,
          transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        }}
      >
        ▶
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            fontFamily: FF.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "#e50914",
            display: "block",
          }}
        >
          FOR YOU
        </span>
        {!loading && hasAny && (
          <span style={{ fontSize: 11, color: "#555", fontFamily: FF.sans, marginTop: 4, display: "block" }}>
            {movieItems.length} movies · {tvItems.length} series · tap for details
          </span>
        )}
        {!loading && !hasAny && (
          <span style={{ fontSize: 11, color: "#555", fontFamily: FF.sans, marginTop: 4, display: "block" }}>
            Suggestions from your ratings (TMDB)
          </span>
        )}
        {loading && (
          <span style={{ fontSize: 11, color: "#444", fontFamily: FF.sans, marginTop: 4, display: "block" }}>
            Loading picks…
          </span>
        )}
      </span>
    </button>
  );

  if (loading) {
    return (
      <section style={{ margin: "0 0 28px", padding: "18px 0", borderBottom: "1px solid #141414" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {headerButton}
          {refreshBtn}
        </div>
        {expanded && (
          <p style={{ fontSize: 11, color: "#444", fontFamily: FF.mono, letterSpacing: "0.12em", margin: "12px 0 0 24px" }}>
            …
          </p>
        )}
      </section>
    );
  }

  if (!hasAny) {
    return (
      <section style={{ margin: "0 0 28px", padding: "18px 0", borderBottom: "1px solid #141414" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {headerButton}
          {refreshBtn}
        </div>
        {expanded && (
          <p style={{ fontSize: 13, color: "#555", margin: "12px 0 0 24px", maxWidth: 520, lineHeight: 1.5 }}>
            {reason || "Rate a few titles (with TMDB linked) to see movie and series picks from The Movie Database."}
          </p>
        )}
      </section>
    );
  }

  return (
    <section style={{ margin: "0 0 28px", padding: "18px 0", borderBottom: "1px solid #141414" }}>
      {modalItem && <RecommendationDetailModal item={modalItem} onClose={() => setModalItem(null)} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: expanded ? 10 : 0 }}>
        {headerButton}
        {refreshBtn}
      </div>

      {expanded && (
        <>
          {algorithm && (
            <div style={{ marginBottom: 14, marginLeft: 24 }}>
              <button
                type="button"
                onClick={() => setShowHow((v) => !v)}
                style={{
                  background: "none",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  color: "#777",
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.1em",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {showHow ? "Hide how this works" : "How are these picked?"}
              </button>
              {showHow && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "14px 16px",
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 10,
                    maxWidth: 640,
                  }}
                >
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9a948a", lineHeight: 1.55 }}>{algorithm.summary}</p>
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#666", lineHeight: 1.5 }}>{algorithm.mlNote}</p>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#7a756c", lineHeight: 1.6 }}>
                    {(algorithm.steps || []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {movieItems.length > 0 && (
            <div style={{ marginBottom: tvItems.length > 0 ? 18 : 0 }}>
              <h3
                style={{
                  margin: "0 0 10px 24px",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  fontFamily: FF.mono,
                  color: "#7a756c",
                  fontWeight: 500,
                }}
              >
                MOVIES
              </h3>
              <RecStrip items={movieItems} onOpen={setModalItem} />
            </div>
          )}

          {tvItems.length > 0 && (
            <div>
              <h3
                style={{
                  margin: "0 0 10px 24px",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  fontFamily: FF.mono,
                  color: "#7a756c",
                  fontWeight: 500,
                }}
              >
                SERIES
              </h3>
              <RecStrip items={tvItems} onOpen={setModalItem} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
