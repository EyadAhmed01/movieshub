"use client";

import { useEffect, useState } from "react";
import { FF } from "@/lib/fonts";

const POSTER = "https://image.tmdb.org/t/p/w342";
const FACE = "https://image.tmdb.org/t/p/w92";

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
  const [aiExtra, setAiExtra] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");

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
    if (!item || !detail) return;
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
  }, [item, detail]);

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
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: FF.sans,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          position: "relative",
          width: "min(540px, 100%)",
          maxHeight: "min(88vh, 720px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #1c1a18 0%, #121110 100%)",
          border: "1px solid #3d3830",
          borderRadius: 14,
          boxShadow: "0 28px 90px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.04) inset",
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
            border: "1px solid #4a4540",
            background: "#252320",
            color: "#e8e4dc",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            fontFamily: FF.sans,
          }}
        >
          ×
        </button>

        <div style={{ padding: "24px 24px 22px" }}>
          {loading && (
            <p style={{ color: "#9a948c", fontFamily: FF.sans, fontSize: 14, margin: "40px 0" }}>
              Loading…
            </p>
          )}
          {loadErr && <p style={{ color: "#e07070", fontSize: 14 }}>{loadErr}</p>}

          {!loading && !loadErr && detail && (
            <>
              <div style={{ display: "flex", gap: 18, marginBottom: 20 }}>
                {detail.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterBig(detail.posterPath)}
                    alt=""
                    width={120}
                    style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 10px 28px rgba(0,0,0,0.55)" }}
                  />
                ) : (
                  <div style={{ width: 120, minHeight: 180, background: "#252220", borderRadius: 10, border: "1px solid #333" }} />
                )}
                <div style={{ minWidth: 0, paddingRight: 40 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontFamily: FF.sans,
                      fontWeight: 600,
                      color: "#e50914",
                      letterSpacing: "0.12em",
                      margin: "0 0 10px",
                      textTransform: "uppercase",
                    }}
                  >
                    {detail.mediaType === "tv" ? "Series" : "Movie"}
                  </p>
                  <h2
                    style={{
                      fontFamily: FF.sans,
                      fontSize: 21,
                      fontWeight: 600,
                      margin: "0 0 10px",
                      color: "#f7f4ef",
                      lineHeight: 1.25,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {detail.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#c4beb4", fontFamily: FF.sans, lineHeight: 1.5 }}>
                    {detail.year != null && `${detail.year}`}
                    {detail.yearsLabel && ` · ${detail.yearsLabel}`}
                    {runtimeLabel && ` · ${runtimeLabel}`}
                    {detail.voteAverage != null && ` · TMDB ★ ${detail.voteAverage.toFixed(1)}`}
                  </p>
                  {Array.isArray(detail.genres) && detail.genres.length > 0 && (
                    <p style={{ margin: "10px 0 0", fontSize: 13, color: "#a8a298", lineHeight: 1.45 }}>{detail.genres.join(" · ")}</p>
                  )}
                </div>
              </div>

              {aiLoading && (
                <p style={{ fontSize: 13, color: "#9a948c", fontFamily: FF.sans, margin: "0 0 12px" }}>
                  Matching extra cast via AI…
                </p>
              )}
              {aiErr && <p style={{ fontSize: 13, color: "#c9a070", margin: "0 0 12px", lineHeight: 1.45 }}>{aiErr}</p>}

              <p
                style={{
                  fontSize: 11,
                  fontFamily: FF.sans,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "#8a8478",
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                }}
              >
                Cast
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mergedCast.length === 0 && !aiLoading && (
                  <p style={{ fontSize: 14, color: "#8a8478", lineHeight: 1.5 }}>
                    No cast listed for this title on TMDB yet.
                  </p>
                )}
                {mergedCast.map((c, i) => (
                  <div
                    key={`${c.id ?? c.name}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      background: "#1e1c1a",
                      borderRadius: 10,
                      border: "1px solid #35302a",
                    }}
                  >
                    {c.profilePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faceSrc(c.profilePath)} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#2e2a26", border: "1px solid #3a3632" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, color: "#f0ebe3", fontWeight: 600 }}>{c.name}</p>
                      {c.character && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9a948a" }}>{c.character}</p>}
                      {c.source === "ai" && (
                        <span style={{ fontSize: 11, fontFamily: FF.sans, color: "#b89870" }}>AI → TMDB match</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {detail.overview && (
                <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.6, color: "#b8b2a8" }}>{detail.overview}</p>
              )}

              <p style={{ margin: "20px 0 0", fontSize: 13 }}>
                <a href={tmdbHref} target="_blank" rel="noopener noreferrer" style={{ color: "#e85c5c" }}>
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
