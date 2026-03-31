"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFaceFrown,
  faFaceGrinStars,
  faFaceMeh,
  faFaceSadTear,
  faFaceSmile,
} from "@fortawesome/free-solid-svg-icons";
import { FF } from "@/lib/fonts";
import { WTW_FORMATS, WTW_GENRES, WTW_LABELS, WTW_MOODS, WTW_TONES } from "@/lib/whatToWatchChoices";

/** Font Awesome solid icons — same 1–5 mood scale as before (API still gets English mood strings). */
const WTW_MOOD_ICONS = {
  "Very sad": faFaceSadTear,
  Sad: faFaceFrown,
  Neutral: faFaceMeh,
  Happy: faFaceSmile,
  "Very happy": faFaceGrinStars,
};

function ChoiceRow({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p
        style={{
          fontSize: 11,
          fontFamily: FF.mono,
          letterSpacing: "0.16em",
          color: "#9a948a",
          textTransform: "uppercase",
          margin: "0 0 12px",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`wtw-choice ${value === opt ? "wtw-choice--on" : ""}`}
            style={{
              background: value === opt ? "rgba(200,196,186,0.1)" : "#141414",
              border: `1px solid ${value === opt ? "#5a5650" : "#2a2a2a"}`,
              borderRadius: 8,
              color: value === opt ? "#f5f0e8" : "#9a948a",
              padding: "10px 14px",
              fontSize: 12,
              fontFamily: FF.sans,
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MoodRow({ value, onChange }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p
        style={{
          fontSize: 11,
          fontFamily: FF.mono,
          letterSpacing: "0.16em",
          color: "#9a948a",
          textTransform: "uppercase",
          margin: "0 0 12px",
        }}
      >
        {WTW_LABELS.mood}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {WTW_MOODS.map((opt) => {
          const icon = WTW_MOOD_ICONS[opt];
          return (
            <button
              key={opt}
              type="button"
              title={opt}
              aria-label={opt}
              onClick={() => onChange(opt)}
              className={`wtw-choice ${value === opt ? "wtw-choice--on" : ""}`}
              style={{
                background: value === opt ? "rgba(200,196,186,0.12)" : "#141414",
                border: `1px solid ${value === opt ? "#5a5650" : "#2a2a2a"}`,
                borderRadius: 10,
                color: value === opt ? "#f5f0e8" : "#b8b0a4",
                padding: "14px 18px",
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 52,
                minHeight: 52,
              }}
            >
              {icon ? (
                <FontAwesomeIcon icon={icon} style={{ width: 28, height: 28 }} />
              ) : (
                opt
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {{ onAddedToWatchlist?: () => void }} props
 */
export default function WhatToWatchContent({ onAddedToWatchlist }) {
  const [mood, setMood] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);
  const [revealKey, setRevealKey] = useState(0);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const ready = mood && genre && format && tone;

  const submit = async () => {
    if (!ready) return;
    setErr("");
    setPayload(null);
    setAddMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/what-to-watch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, genre, format, tone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setPayload(data);
      setRevealKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async () => {
    const m = payload?.tmdbMatch;
    if (!m) return;
    setAddBusy(true);
    setAddMsg("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: m.tmdbId, mediaType: m.mediaType }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setAddMsg("Already on your watchlist.");
        return;
      }
      if (!res.ok) throw new Error(data.error || res.statusText);
      setAddMsg("Added to Watch next.");
      onAddedToWatchlist?.();
    } catch (e) {
      setAddMsg(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAddBusy(false);
    }
  };

  const s = payload?.suggestion;
  const match = payload?.tmdbMatch;

  return (
    <div>
      <MoodRow value={mood} onChange={setMood} />
      <ChoiceRow label={WTW_LABELS.genre} options={WTW_GENRES} value={genre} onChange={setGenre} />
      <ChoiceRow label={WTW_LABELS.format} options={WTW_FORMATS} value={format} onChange={setFormat} />
      <ChoiceRow label={WTW_LABELS.tone} options={WTW_TONES} value={tone} onChange={setTone} />

      <button
        type="button"
        disabled={!ready || loading}
        onClick={submit}
        style={{
          marginTop: 8,
          background: !ready || loading ? "#222" : "#2a2826",
          border: "1px solid #4a4540",
          borderRadius: 8,
          color: !ready || loading ? "#555" : "#e8e0d8",
          padding: "14px 28px",
          fontSize: 12,
          fontFamily: FF.mono,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: !ready || loading ? "default" : "pointer",
        }}
      >
        {loading ? "Asking Llama…" : "Get a pick"}
      </button>

      {err && <p style={{ color: "#c44", marginTop: 18, fontSize: 14 }}>{err}</p>}

      {s && (
        <div
          key={revealKey}
          className="wtw-card"
          style={{
            marginTop: 36,
            padding: "28px 26px 26px",
            background: "linear-gradient(165deg, #161412 0%, #0f0e0c 100%)",
            border: "1px solid #2a2520",
            borderRadius: 16,
          }}
        >
          <p
            className="wtw-reveal wtw-reveal--1"
            style={{
              fontSize: 10,
              fontFamily: FF.mono,
              letterSpacing: "0.2em",
              color: "#9a948a",
              margin: "0 0 12px",
            }}
          >
            FOR YOU
          </p>
          <h2
            className="wtw-reveal wtw-reveal--2"
            style={{
              fontFamily: FF.display,
              fontSize: "clamp(24px, 5vw, 34px)",
              fontWeight: 400,
              margin: "0 0 8px",
              color: "#f8f4ec",
              lineHeight: 1.15,
            }}
          >
            {s.title}
          </h2>
          <p
            className="wtw-reveal wtw-reveal--3"
            style={{ margin: 0, fontSize: 12, fontFamily: FF.mono, color: "#7a756c", letterSpacing: "0.06em" }}
          >
            {s.genreLabel}
            <span style={{ margin: "0 10px", color: "#333" }}>·</span>
            {s.durationGuess}
            {match?.year != null && (
              <>
                <span style={{ margin: "0 10px", color: "#333" }}>·</span>
                {match.mediaType === "tv" ? "Series" : "Movie"} · TMDB year {match.year}
              </>
            )}
          </p>
          <p className="wtw-reveal wtw-reveal--4" style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.65, color: "#c4beb4" }}>
            {s.description}
          </p>

          <div className="wtw-reveal wtw-reveal--5" style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            {match ? (
              <button
                type="button"
                disabled={addBusy}
                onClick={addToWatchlist}
                style={{
                  background: addBusy ? "#333" : "#f5f0e8",
                  border: "none",
                  borderRadius: 8,
                  color: "#1a1a1a",
                  padding: "12px 22px",
                  fontSize: 11,
                  fontFamily: FF.mono,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: addBusy ? "wait" : "pointer",
                }}
              >
                {addBusy ? "Adding…" : "Add to my list"}
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "#865" }}>No TMDB match — add this title manually from Watch next search.</span>
            )}
            {addMsg && <span style={{ fontSize: 12, color: addMsg.includes("Added") ? "#7a8" : "#a77" }}>{addMsg}</span>}
          </div>

          {match && (
            <p className="wtw-reveal wtw-reveal--6" style={{ margin: "14px 0 0", fontSize: 11, color: "#444", fontFamily: FF.mono }}>
              Linked: {match.title} ({match.mediaType === "tv" ? "TV" : "Movie"} · TMDB #{match.tmdbId})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
