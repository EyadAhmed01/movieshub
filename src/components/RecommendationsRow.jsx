"use client";

import { useEffect, useState } from "react";
import { FF } from "@/lib/fonts";

const TMDB_IMG = "https://image.tmdb.org/t/p/w154";

function posterSrc(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMG}${posterPath}`;
}

export default function RecommendationsRow() {
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recommendations", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setReason(data.reason || "");
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section style={{ margin: "0 0 28px" }}>
        <p style={{ fontSize: 11, color: "#444", fontFamily: FF.mono, letterSpacing: "0.12em" }}>Loading picks…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section style={{ margin: "0 0 28px", padding: "18px 0", borderBottom: "1px solid #141414" }}>
        <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 8px" }}>
          FOR YOU
        </h2>
        <p style={{ fontSize: 13, color: "#555", margin: 0, maxWidth: 520 }}>
          {reason || "Rate a few TMDB-linked titles to see recommendations from The Movie Database."}
        </p>
      </section>
    );
  }

  return (
    <section style={{ margin: "0 0 28px", padding: "18px 0", borderBottom: "1px solid #141414" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <h2 style={{ fontFamily: FF.mono, fontSize: 10, letterSpacing: "0.2em", color: "#e50914", margin: 0 }}>
          FOR YOU
        </h2>
        <span style={{ fontSize: 10, color: "#444", fontFamily: FF.mono }}>From your ratings · TMDB</span>
      </div>
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
          <article
            key={`${x.mediaType}-${x.tmdbId}`}
            style={{
              flex: "0 0 auto",
              width: 120,
              background: "#111",
              border: "1px solid #1f1f1f",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div style={{ aspectRatio: "2/3", background: "#0a0a0a" }}>
              {x.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterSrc(x.posterPath)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 11 }}>
                  No poster
                </div>
              )}
            </div>
            <div style={{ padding: "8px 10px 10px" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#d0ccc4", lineHeight: 1.35, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {x.title}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 9, fontFamily: FF.mono, color: "#555", letterSpacing: "0.08em" }}>
                {x.mediaType === "tv" ? "SERIES" : "MOVIE"}
                {x.year != null ? ` · ${x.year}` : ""}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
