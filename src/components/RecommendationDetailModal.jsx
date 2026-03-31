"use client";

import { useEffect, useState, useCallback } from "react";
import { FF } from "@/lib/fonts";

const POSTER = "https://image.tmdb.org/t/p/w342";
const FACE = "https://image.tmdb.org/t/p/w92";

const STORAGE_AI = "forYouModalUseAi";

function faceSrc(path) {
  if (!path) return null;
  return `${FACE}${path}`;
}

function posterBig(path) {
  if (!path) return null;
  return `${POSTER}${path}`;
}

export default function RecommendationDetailModal({ item, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [aiExtra, setAiExtra] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_AI);
      setUseAi(v === "true");
    } catch {
      setUseAi(false);
    }
  }, []);

  const persistAi = useCallback((on) => {
    setUseAi(on);
    try {
      localStorage.setItem(STORAGE_AI, on ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setDetail(null);
    setLoadErr("");
    setAiExtra([]);
    setAiErr("");
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/tmdb/details?id=${item.tmdbId}&type=${item.mediaType}&extended=1`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || res.statusText);
        setDetail(data.detail);
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!item || !detail || !useAi) {
      if (!useAi) setAiExtra([]);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    setAiErr("");
    (async () => {
      try {
        const existingPersonIds = (detail.cast || []).map((c) => c.id).filter((id) => typeof id === "number");
        const res = await fetch("/api/tmdb/ai-cast-match", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: detail.title,
            year: detail.year,
            mediaType: detail.mediaType,
            existingPersonIds,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || res.statusText);
        setAiExtra(Array.isArray(data.supplemental) ? data.supplemental : []);
      } catch (e) {
        if (!cancelled) setAiErr(e instanceof Error ? e.message : "AI cast failed");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item, detail, useAi]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  const tmdbHref =
    item.mediaType === "tv"
      ? `https://www.themoviedb.org/tv/${item.tmdbId}`
      : `https://www.themoviedb.org/movie/${item.tmdbId}`;

  const tmdbCast = detail?.cast || [];
  const mergedCast = [...tmdbCast, ...aiExtra];

  const runtimeLabel =
    detail?.mediaType === "movie" && detail?.runtimeMinutes
      ? `${Math.floor(detail.runtimeMinutes / 60)}h ${detail.runtimeMinutes % 60}m`
      : detail?.mediaType === "tv" && detail?.episodeRuntimeMinutes
        ? `~${detail.episodeRuntimeMinutes} min/ep`
        : null;

  return (
    <div
      className="rec-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Title details"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          maxHeight: "min(88vh, 720px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #141210 0%, #0c0b0a 100%)",
          border: "1px solid #2a2520",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid #333",
            background: "#1a1816",
            color: "#c8c4ba",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            fontFamily: FF.sans,
          }}
        >
          ×
        </button>

        <div style={{ padding: "22px 22px 20px" }}>
          {loading && (
            <p style={{ color: "#666", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.12em", margin: "40px 0" }}>
              Loading…
            </p>
          )}
          {loadErr && <p style={{ color: "#c44", fontSize: 14 }}>{loadErr}</p>}

          {!loading && !loadErr && detail && (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                {detail.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterBig(detail.posterPath)}
                    alt=""
                    width={120}
                    style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  />
                ) : (
                  <div style={{ width: 120, minHeight: 180, background: "#1a1a1a", borderRadius: 10 }} />
                )}
                <div style={{ minWidth: 0, paddingRight: 36 }}>
                  <p style={{ fontSize: 10, fontFamily: FF.mono, color: "#e50914", letterSpacing: "0.16em", margin: "0 0 8px" }}>
                    {detail.mediaType === "tv" ? "SERIES" : "MOVIE"}
                  </p>
                  <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: "0 0 8px", color: "#f5f0e8", lineHeight: 1.2 }}>
                    {detail.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: "#7a756c", fontFamily: FF.mono }}>
                    {detail.year != null && `${detail.year}`}
                    {detail.yearsLabel && ` · ${detail.yearsLabel}`}
                    {runtimeLabel && ` · ${runtimeLabel}`}
                    {detail.voteAverage != null && ` · TMDB ★ ${detail.voteAverage.toFixed(1)}`}
                  </p>
                  {Array.isArray(detail.genres) && detail.genres.length > 0 && (
                    <p style={{ margin: "10px 0 0", fontSize: 11, color: "#8a857c" }}>{detail.genres.join(" · ")}</p>
                  )}
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  fontSize: 12,
                  color: "#9a948a",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input type="checkbox" checked={useAi} onChange={(e) => persistAi(e.target.checked)} />
                Use AI (Llama) to suggest cast, then match names to TMDB profiles
              </label>
              {aiLoading && <p style={{ fontSize: 11, color: "#666", fontFamily: FF.mono, margin: "0 0 10px" }}>Matching AI cast to TMDB…</p>}
              {aiErr && <p style={{ fontSize: 12, color: "#a77", margin: "0 0 10px" }}>{aiErr}</p>}

              <p style={{ fontSize: 10, fontFamily: FF.mono, letterSpacing: "0.14em", color: "#555", margin: "0 0 10px" }}>
                CAST
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mergedCast.length === 0 && !aiLoading && (
                  <p style={{ fontSize: 13, color: "#555" }}>No cast listed. Turn on AI above to try filling from Llama + TMDB search.</p>
                )}
                {mergedCast.map((c, i) => (
                  <div
                    key={`${c.id ?? c.name}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "#111",
                      borderRadius: 8,
                      border: "1px solid #1f1f1f",
                    }}
                  >
                    {c.profilePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faceSrc(c.profilePath)} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#222" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#e8e0d8", fontWeight: 500 }}>{c.name}</p>
                      {c.character && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#666" }}>{c.character}</p>}
                      {c.source === "ai" && (
                        <span style={{ fontSize: 9, fontFamily: FF.mono, color: "#865" }}>
                          AI → TMDB match
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {detail.overview && (
                <p style={{ margin: "18px 0 0", fontSize: 13, lineHeight: 1.55, color: "#a8a298" }}>{detail.overview}</p>
              )}

              <p style={{ margin: "18px 0 0", fontSize: 11 }}>
                <a href={tmdbHref} target="_blank" rel="noopener noreferrer" style={{ color: "#c44" }}>
                  Open full page on TMDB →
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
