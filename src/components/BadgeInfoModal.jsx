"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FF } from "@/lib/fonts";
import { getNextBadge } from "@/lib/badges";

function formatMinutes(total) {
  if (total == null || total < 1) return "0 min";
  const h = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  if (h <= 0) return `${mins} min`;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

/**
 * @param {{ open: boolean; onClose: () => void; badge: { title: string; blurb: string; minMinutes: number } | null | undefined; totalMinutes?: number }} props
 */
export default function BadgeInfoModal({ open, onClose, badge, totalMinutes = 0 }) {
  useEffect(() => {
    if (!open || !badge) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, badge]);

  if (!open || !badge) return null;

  const logged = Math.max(0, Number(totalMinutes) || 0);
  const next = getNextBadge(logged);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 425,
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
          width: "min(440px, 100%)",
          maxHeight: "min(85vh, 640px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #1a1512 0%, #0e0c0b 100%)",
          border: "1px solid #4a3f38",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px 12px",
            borderBottom: "1px solid #2a2420",
          }}
        >
          <p
            id="badge-modal-title"
            style={{
              margin: 0,
              fontSize: 11,
              fontFamily: FF.sans,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#c45c4e",
            }}
          >
            Watch-time rank
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #444",
              borderRadius: 8,
              color: "#a8a29a",
              fontSize: 13,
              fontFamily: FF.sans,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: "22px 22px 26px" }}>
          <h2
            style={{
              margin: "0 0 12px",
              fontFamily: FF.display,
              fontSize: 28,
              fontWeight: 400,
              color: "#f5f0e8",
              lineHeight: 1.15,
            }}
          >
            {badge.title}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, color: "#b5aea4" }}>{badge.blurb}</p>

          <div
            style={{
              border: "1px solid #2a2520",
              borderRadius: 10,
              padding: "14px 16px",
              background: "rgba(0,0,0,0.25)",
              marginBottom: 16,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#7a7268", fontFamily: FF.sans, fontWeight: 600 }}>
              How this rank works
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#c9c2b8" }}>
              This badge is yours once your library reaches <strong style={{ color: "#ece8e0" }}>{formatMinutes(badge.minMinutes)}</strong>{" "}
              of logged runtime (TMDB movie lengths and series episode length × episodes when both exist).
            </p>
          </div>

          <p style={{ margin: "0 0 10px", fontSize: 14, color: "#9a948a" }}>
            You’ve logged <strong style={{ color: "#e8e0d6" }}>{formatMinutes(logged)}</strong> so far.
          </p>

          {next ? (
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "#7a756c" }}>
              Next rank: <strong style={{ color: "#c9c2b8" }}>{next.title}</strong> at {formatMinutes(next.minMinutes)}.
            </p>
          ) : (
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "#6a7a62" }}>You’re at the top tier. Legend status.</p>
          )}

          <Link
            href="/profile"
            onClick={onClose}
            style={{
              display: "inline-block",
              fontSize: 14,
              fontFamily: FF.sans,
              fontWeight: 600,
              color: "#e8a090",
              textDecoration: "none",
              borderBottom: "1px solid rgba(232, 160, 144, 0.4)",
            }}
          >
            Open profile &amp; settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
