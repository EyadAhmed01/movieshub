"use client";

import { useEffect } from "react";
import { FF } from "@/lib/fonts";
import WhatToWatchContent from "@/components/WhatToWatchContent";

export default function WhatToWatchModal({ onClose, onAddedToWatchlist }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="rec-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="What to watch"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 420,
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
          width: "min(560px, 100%)",
          maxHeight: "min(90vh, 800px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #141210 0%, #0c0b0a 100%)",
          border: "1px solid #2a2520",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px 10px",
            background: "linear-gradient(180deg, #141210 92%, transparent)",
            borderBottom: "1px solid #1f1c18",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#9a948a",
              fontSize: 10,
              fontFamily: FF.mono,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
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
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "8px 22px 28px" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "#9a948a", fontFamily: FF.mono, margin: "0 0 6px" }}>PICKER</p>
          <h2 style={{ fontFamily: FF.display, fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 400, margin: "0 0 8px", color: "#f5f0e8" }}>
            What to watch?
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 12, color: "#6a6a6a", lineHeight: 1.5 }}>
            Pick mood, genre, format, and tone. Reel Llama suggests one title; we match it on TMDB.
          </p>
          <WhatToWatchContent onAddedToWatchlist={onAddedToWatchlist} />
        </div>
      </div>
    </div>
  );
}
