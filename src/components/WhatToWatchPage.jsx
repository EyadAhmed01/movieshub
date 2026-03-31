"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";
import {
  WTW_FORMATS,
  WTW_GENRES,
  WTW_LABELS,
  WTW_MOODS,
  WTW_TONES,
} from "@/lib/whatToWatchChoices";

function ChoiceRow({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p
        style={{
          fontSize: 11,
          fontFamily: FF.mono,
          letterSpacing: "0.16em",
          color: "#e50914",
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
              background: value === opt ? "rgba(229,9,20,0.12)" : "#141414",
              border: `1px solid ${value === opt ? "#e50914" : "#2a2a2a"}`,
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

export default function WhatToWatchPage() {
  const { status } = useSession();
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
    } catch (e) {
      setAddMsg(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAddBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em" }}>LOADING…</p>
      </div>
    );
  }

  const s = payload?.suggestion;
  const match = payload?.tmdbMatch;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", fontFamily: FF.sans }}>
      <header
        style={{
          borderBottom: "1px solid #181818",
          padding: "24px clamp(18px, 4vw, 36px) 20px",
          background: "rgba(10,10,10,0.94)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.22em", color: "#e50914", fontFamily: FF.mono, margin: "0 0 8px" }}>
                PICKER
              </p>
              <h1 style={{ fontFamily: FF.display, fontSize: "clamp(26px, 6vw, 40px)", fontWeight: 400, margin: 0, color: "#f5f0e8" }}>
                What to watch?
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#6a6a6a", maxWidth: 520, lineHeight: 1.5 }}>
                Answer with the buttons below. Reel Llama picks one title; we try to match it on TMDB so you can add it to{" "}
                <Link href="/watchlist" style={{ color: "#c44" }}>
                  Watch next
                </Link>
                .
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link
                href="/"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Library
              </Link>
              <Link
                href="/watchlist"
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  textDecoration: "none",
                  border: "1px solid #333",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Watch next
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  fontSize: 10,
                  fontFamily: FF.mono,
                  background: "none",
                  border: "1px solid #2a2a2a",
                  color: "#665",
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px clamp(18px, 4vw, 36px) 100px" }}>
        <ChoiceRow label={WTW_LABELS.mood} options={WTW_MOODS} value={mood} onChange={setMood} />
        <ChoiceRow label={WTW_LABELS.genre} options={WTW_GENRES} value={genre} onChange={setGenre} />
        <ChoiceRow label={WTW_LABELS.format} options={WTW_FORMATS} value={format} onChange={setFormat} />
        <ChoiceRow label={WTW_LABELS.tone} options={WTW_TONES} value={tone} onChange={setTone} />

        <button
          type="button"
          disabled={!ready || loading}
          onClick={submit}
          style={{
            marginTop: 8,
            background: !ready || loading ? "#222" : "#e50914",
            border: "none",
            borderRadius: 8,
            color: !ready || loading ? "#555" : "#fff",
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
            <p className="wtw-reveal wtw-reveal--1" style={{ fontSize: 10, fontFamily: FF.mono, letterSpacing: "0.2em", color: "#e50914", margin: "0 0 12px" }}>
              FOR YOU
            </p>
            <h2 className="wtw-reveal wtw-reveal--2" style={{ fontFamily: FF.display, fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 400, margin: "0 0 8px", color: "#f8f4ec", lineHeight: 1.15 }}>
              {s.title}
            </h2>
            <p className="wtw-reveal wtw-reveal--3" style={{ margin: 0, fontSize: 12, fontFamily: FF.mono, color: "#7a756c", letterSpacing: "0.06em" }}>
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
            <p className="wtw-reveal wtw-reveal--4" style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.65, color: "#c4beb4" }}>{s.description}</p>

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
      </main>
    </div>
  );
}
