"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";

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

function formatMinutes(total) {
  if (!total || total < 1) return "0 min";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h <= 0) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const linkBtn = {
  fontSize: 10,
  fontFamily: FF.mono,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8a8a8a",
  textDecoration: "none",
  border: "1px solid #333",
  padding: "8px 12px",
  borderRadius: 6,
};

const card = {
  border: "1px solid #222",
  borderRadius: 10,
  padding: "18px 20px",
  background: "#111",
  marginBottom: 16,
};

export default function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [err, setErr] = useState("");
  const [insightsErr, setInsightsErr] = useState("");
  const [regenBusy, setRegenBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [name, setName] = useState("");
  const [showBadgesOnHome, setShowBadgesOnHome] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [chatSpoilerMode, setChatSpoilerMode] = useState("warn");

  const loadProfile = useCallback(async () => {
    setErr("");
    const p = await apiJson("/api/profile");
    setProfile(p);
    setName(p.name || "");
    setShowBadgesOnHome(Boolean(p.preferences?.showBadgesOnHome));
    setWeeklyDigest(Boolean(p.preferences?.weeklyDigest));
    setChatSpoilerMode(p.preferences?.chatSpoilerMode === "open" ? "open" : "warn");
  }, []);

  const loadInsights = useCallback(async (refresh = false) => {
    setInsightsErr("");
    const url = refresh ? "/api/profile/insights?refresh=1" : "/api/profile/insights";
    const j = await apiJson(url);
    setInsightsData(j);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        await loadProfile();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
  }, [status, loadProfile]);

  useEffect(() => {
    if (status !== "authenticated" || !profile) return;
    (async () => {
      try {
        await loadInsights(false);
      } catch (e) {
        setInsightsErr(e instanceof Error ? e.message : "Failed to load insights");
      }
    })();
  }, [status, profile, loadInsights]);

  const regenerate = async () => {
    setRegenBusy(true);
    setInsightsErr("");
    try {
      await loadInsights(true);
    } catch (e) {
      setInsightsErr(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setRegenBusy(false);
    }
  };

  const saveSettings = async () => {
    setSaveBusy(true);
    setSaveMsg("");
    try {
      const p = await apiJson("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          preferences: {
            showBadgesOnHome,
            weeklyDigest,
            chatSpoilerMode,
          },
        }),
      });
      setProfile(p);
      setSaveMsg("Saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !profile && !err)) {
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
        <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em" }}>LOADING…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#c88", padding: 40, fontFamily: FF.sans }}>
        <p>{err}</p>
        <Link href="/" style={{ color: "#e50914" }}>
          Home
        </Link>
      </div>
    );
  }

  const insights = insightsData?.insights;
  const stats = insightsData?.stats;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: FF.sans, color: "#e8e0d0" }}>
      <header
        style={{
          borderBottom: "1px solid #181818",
          padding: "28px clamp(20px, 4vw, 40px) 22px",
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "#e50914",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  fontFamily: FF.mono,
                  fontWeight: 500,
                }}
              >
                Account
              </p>
              <h1
                style={{
                  fontFamily: FF.display,
                  fontSize: "clamp(22px, 5vw, 36px)",
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  margin: 0,
                  color: "#f5f0e8",
                }}
              >
                My profile
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Link href="/" style={linkBtn}>
                ← Library
              </Link>
              <Link href="/analytics" style={linkBtn}>
                Analytics
              </Link>
              <Link href="/watchlist" style={linkBtn}>
                Watch next
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  background: "none",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#9a9a9a",
                  padding: "8px 14px",
                  fontSize: 11,
                  fontFamily: FF.mono,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#666", maxWidth: 720, lineHeight: 1.55 }}>
            Taste notes and your &ldquo;month like you&rdquo; refresh with the calendar month (and a weekly key for the stretch pick). Use
            Regenerate if you want a new take without waiting.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "24px clamp(20px, 4vw, 40px) 48px" }}>
        <div style={{ ...card, marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, fontFamily: FF.mono, color: "#666", letterSpacing: "0.1em" }}>
            SIGNED IN AS
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#ddd" }}>{profile?.email}</p>
          {profile?.createdAt && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#555" }}>
              Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
            </p>
          )}
          {stats && (
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "#9a9a9a" }}>
              <strong style={{ color: "#c9c2b4" }}>{formatMinutes(stats.totalMinutesWatched)}</strong> logged
              {stats.movieCount != null && (
                <>
                  {" "}
                  · {stats.movieCount} films, {stats.seriesCount} series
                </>
              )}
            </p>
          )}
        </div>

        <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: "28px 0 14px", color: "#eae6dc" }}>
          Watch-time badges
        </h2>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 16px", maxWidth: 640 }}>
          Unlocks based on total runtime in your library (movies use TMDB runtime; series use episode length × episodes when both exist).
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {(insightsData?.badges || []).map(({ badge, unlocked }) => (
            <div
              key={badge.id}
              style={{
                border: `1px solid ${unlocked ? "rgba(229, 9, 20, 0.35)" : "#252525"}`,
                borderRadius: 10,
                padding: "14px 16px",
                background: unlocked ? "rgba(229, 9, 20, 0.06)" : "#0d0d0d",
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontFamily: FF.mono, color: unlocked ? "#e50914" : "#444", letterSpacing: "0.08em" }}>
                {unlocked ? "UNLOCKED" : "LOCKED"}
              </p>
              <p style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 600, color: unlocked ? "#f5f0e8" : "#777" }}>{badge.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#777", lineHeight: 1.45 }}>{badge.blurb}</p>
              <p style={{ margin: "10px 0 0", fontSize: 10, color: "#555", fontFamily: FF.mono }}>
                ≥ {formatMinutes(badge.minMinutes)}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: 0, color: "#eae6dc" }}>
            Taste profile &amp; blind spots
          </h2>
          <button
            type="button"
            disabled={regenBusy || !insightsData?.llmConfigured}
            onClick={regenerate}
            style={{
              fontSize: 10,
              fontFamily: FF.mono,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: insightsData?.llmConfigured ? "#8a8a8a" : "#444",
              background: "transparent",
              border: "1px solid #333",
              padding: "8px 14px",
              borderRadius: 6,
              cursor: insightsData?.llmConfigured && !regenBusy ? "pointer" : "not-allowed",
            }}
          >
            {regenBusy ? "Working…" : "Regenerate"}
          </button>
        </div>

        {insightsData?.llmError && (
          <p style={{ fontSize: 12, color: "#a77", marginBottom: 12 }}>{insightsData.llmError}</p>
        )}
        {insightsErr && <p style={{ fontSize: 12, color: "#a77", marginBottom: 12 }}>{insightsErr}</p>}

        {insightsData && !insights && !insightsData?.emptyLibrary && (
          <div style={{ ...card, color: "#888" }}>
            {insightsData.llmConfigured === false
              ? "Configure Groq or Ollama to generate taste insights."
              : insightsData.llmError || "Insights unavailable — try Regenerate."}
          </div>
        )}
        {!insightsData && (
          <div style={{ ...card, color: "#888" }}>Loading insights…</div>
        )}

        {insights && (
          <>
            <div style={card}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#d5cec2" }}>{insights.tasteSummary}</p>
              <ul style={{ margin: "14px 0 0", paddingLeft: 18, color: "#9a9a9a", fontSize: 13, lineHeight: 1.5 }}>
                {(insights.patternBullets || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
                <p style={{ margin: 0, fontSize: 11, fontFamily: FF.mono, color: "#e50914", letterSpacing: "0.08em" }}>BLIND SPOT</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#bbb" }}>{insights.blindSpot}</p>
                <p style={{ margin: "14px 0 0", fontSize: 11, fontFamily: FF.mono, color: "#8a8a8a", letterSpacing: "0.08em" }}>THIS WEEK&apos;S STRETCH</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#bbb" }}>{insights.stretchGoal}</p>
                {insights.entryPick?.title && (
                  <>
                    <p style={{ margin: "14px 0 0", fontSize: 11, fontFamily: FF.mono, color: "#6a9a6a", letterSpacing: "0.08em" }}>
                      ENTRY-LEVEL PICK
                    </p>
                    <p style={{ margin: "8px 0 0", fontSize: 14, color: "#e8e0d0" }}>
                      <strong>{insights.entryPick.title}</strong>
                      <span style={{ color: "#666", fontSize: 12 }}> ({insights.entryPick.mediaType})</span>
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>{insights.entryPick.why}</p>
                  </>
                )}
              </div>
              {(insightsData?.fromCache && insightsData?.cachedAt) || insightsData?.weekKey ? (
                <p style={{ margin: "14px 0 0", fontSize: 10, color: "#444", fontFamily: FF.mono }}>
                  Week key {insightsData.weekKey}
                  {insightsData.monthKey ? ` · Month key ${insightsData.monthKey}` : ""}
                  {insightsData.staleFallback ? " · showing last good cache after error" : ""}
                </p>
              ) : null}
            </div>

            <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: "28px 0 14px", color: "#eae6dc" }}>
              The month that&apos;s basically you
            </h2>
            <div style={{ ...card, background: "linear-gradient(145deg, #141008 0%, #0f0f12 100%)", borderColor: "#2a2520" }}>
              <p style={{ margin: 0, fontSize: 42, lineHeight: 1, fontFamily: FF.display, color: "#f0e8dc" }}>
                {insights.symbolicMonth?.name || "—"}
              </p>
              <p style={{ margin: "12px 0 0", fontSize: 15, fontStyle: "italic", color: "#c4b8a8" }}>
                {insights.symbolicMonth?.tagline}
              </p>
              <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.55, color: "#9a9a9a" }}>{insights.symbolicMonth?.whyChosen}</p>
              <p style={{ margin: "16px 0 0", fontSize: 11, color: "#555" }}>
                Picked for this rotation ({insightsData?.monthKey}) — your stats, one calendar month as a personality.
              </p>
            </div>
          </>
        )}

        <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: "36px 0 14px", color: "#eae6dc" }}>Settings</h2>
        <div style={card}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 11, fontFamily: FF.mono, color: "#777", marginBottom: 6 }}>DISPLAY NAME</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we greet you?"
              style={{
                width: "100%",
                maxWidth: 400,
                boxSizing: "border-box",
                background: "#0f0f0f",
                border: "1px solid #2a2a2a",
                color: "#e8e0d0",
                padding: "10px 14px",
                fontSize: 14,
                fontFamily: FF.sans,
                borderRadius: 6,
              }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={showBadgesOnHome} onChange={(e) => setShowBadgesOnHome(e.target.checked)} />
            <span style={{ fontSize: 13, color: "#bbb" }}>Show badge summary on the library header</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer", opacity: 0.5 }}>
            <input type="checkbox" checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} disabled />
            <span style={{ fontSize: 13, color: "#bbb" }}>Weekly email digest (coming soon)</span>
          </label>

          <div style={{ marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 11, fontFamily: FF.mono, color: "#777", marginBottom: 8 }}>CHAT SPOILER HINTS (stored for later)</span>
            <select
              value={chatSpoilerMode}
              onChange={(e) => setChatSpoilerMode(e.target.value)}
              style={{
                background: "#0f0f0f",
                border: "1px solid #2a2a2a",
                color: "#e8e0d0",
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: FF.sans,
                borderRadius: 6,
              }}
            >
              <option value="warn">Warn before big spoilers</option>
              <option value="open">No extra spoiler filtering</option>
            </select>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saveBusy}
            style={{
              background: "#e50914",
              border: "none",
              color: "#fff",
              padding: "10px 22px",
              fontSize: 12,
              fontFamily: FF.mono,
              letterSpacing: "0.1em",
              borderRadius: 6,
              cursor: saveBusy ? "wait" : "pointer",
            }}
          >
            {saveBusy ? "Saving…" : "Save settings"}
          </button>
          {saveMsg && (
            <span style={{ marginLeft: 14, fontSize: 12, color: saveMsg === "Saved." ? "#6a8a6a" : "#c88" }}>{saveMsg}</span>
          )}
        </div>
      </main>
    </div>
  );
}
