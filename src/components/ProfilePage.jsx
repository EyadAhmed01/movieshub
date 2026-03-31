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

const inputCss = {
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
};

export default function ProfilePage() {
  const { status, update } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [err, setErr] = useState("");
  const [insightsErr, setInsightsErr] = useState("");

  const [name, setName] = useState("");
  const [showBadgesOnHome, setShowBadgesOnHome] = useState(true);
  const [chatSpoilerMode, setChatSpoilerMode] = useState("warn");

  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [prefBusy, setPrefBusy] = useState(false);
  const [prefMsg, setPrefMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const loadProfile = useCallback(async () => {
    setErr("");
    const p = await apiJson("/api/profile");
    setProfile(p);
    setName(p.name || "");
    setShowBadgesOnHome(Boolean(p.preferences?.showBadgesOnHome));
    setChatSpoilerMode(p.preferences?.chatSpoilerMode === "open" ? "open" : "warn");
  }, []);

  const loadInsights = useCallback(async () => {
    setInsightsErr("");
    const j = await apiJson("/api/profile/insights");
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
        await loadInsights();
      } catch (e) {
        setInsightsErr(e instanceof Error ? e.message : "Failed to load insights");
      }
    })();
  }, [status, profile, loadInsights]);

  const saveName = async () => {
    setNameBusy(true);
    setNameMsg("");
    try {
      const p = await apiJson("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setProfile(p);
      setNameMsg("Saved.");
      await update({ name: p.name || "" });
    } catch (e) {
      setNameMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setNameBusy(false);
    }
  };

  const savePreferences = async () => {
    setPrefBusy(true);
    setPrefMsg("");
    try {
      const p = await apiJson("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          preferences: {
            showBadgesOnHome,
            chatSpoilerMode,
          },
        }),
      });
      setProfile(p);
      setPrefMsg("Saved.");
    } catch (e) {
      setPrefMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPrefBusy(false);
    }
  };

  const savePassword = async () => {
    setPwdMsg("");
    if (newPassword !== confirmPassword) {
      setPwdMsg("New password and confirmation do not match.");
      return;
    }
    setPwdBusy(true);
    try {
      await apiJson("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg("Password updated.");
    } catch (e) {
      setPwdMsg(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPwdBusy(false);
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
  const currentBadge = insightsData?.currentBadge;

  const tabBtn = (id, label) => (
    <button
      type="button"
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: activeTab === id ? "2px solid #e50914" : "2px solid transparent",
        color: activeTab === id ? "#f5f0e8" : "#666",
        padding: "10px 4px",
        marginRight: 20,
        fontSize: 12,
        fontFamily: FF.mono,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );

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
            Taste notes and your &ldquo;month like you&rdquo; update when the calendar month changes (cached so we don&apos;t spam the AI).
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "24px clamp(20px, 4vw, 40px) 48px" }}>
        <div style={{ borderBottom: "1px solid #222", marginBottom: 24 }}>
          {tabBtn("profile", "Profile")}
          {tabBtn("settings", "Settings")}
        </div>

        {activeTab === "profile" && (
          <>
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 11, fontFamily: FF.mono, color: "#666", letterSpacing: "0.1em" }}>
                SIGNED IN AS
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 15, color: "#ddd" }}>{profile?.email}</p>
              {profile?.name && (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
                  Name: <span style={{ color: "#c9c2b4" }}>{profile.name}</span>
                </p>
              )}
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
              Your watch-time rank
            </h2>
            <p style={{ fontSize: 12, color: "#666", margin: "0 0 16px", maxWidth: 640 }}>
              One rank at a time, based on total runtime in your library (movies: TMDB runtime; series: episode length × episodes when both
              exist).
            </p>
            {currentBadge && (
              <div
                style={{
                  ...card,
                  border: "1px solid rgba(229, 9, 20, 0.35)",
                  background: "rgba(229, 9, 20, 0.06)",
                  maxWidth: 480,
                }}
              >
                <p style={{ margin: 0, fontSize: 10, fontFamily: FF.mono, color: "#e50914", letterSpacing: "0.08em" }}>CURRENT BADGE</p>
                <p style={{ margin: "10px 0 6px", fontSize: 20, fontWeight: 600, color: "#f5f0e8", fontFamily: FF.display }}>{currentBadge.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#9a9a9a", lineHeight: 1.5 }}>{currentBadge.blurb}</p>
                <p style={{ margin: "12px 0 0", fontSize: 10, color: "#555", fontFamily: FF.mono }}>
                  Unlocks at ≥ {formatMinutes(currentBadge.minMinutes)} watched
                </p>
              </div>
            )}

            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontFamily: FF.display, fontSize: 22, fontWeight: 400, margin: "0 0 12px", color: "#eae6dc" }}>
                Taste profile &amp; blind spots
              </h2>

              {insightsData?.llmError && (
                <p style={{ fontSize: 12, color: "#a77", marginBottom: 12 }}>{insightsData.llmError}</p>
              )}
              {insightsErr && <p style={{ fontSize: 12, color: "#a77", marginBottom: 12 }}>{insightsErr}</p>}

              {insightsData && !insights && !insightsData?.emptyLibrary && (
                <div style={{ ...card, color: "#888" }}>
                  {insightsData.llmConfigured === false
                    ? "Configure Groq or Ollama to generate taste insights."
                    : insightsData.llmError || "Insights unavailable."}
                </div>
              )}
              {!insightsData && <div style={{ ...card, color: "#888" }}>Loading insights…</div>}

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
                      <p style={{ margin: "14px 0 0", fontSize: 11, fontFamily: FF.mono, color: "#8a8a8a", letterSpacing: "0.08em" }}>
                        THIS WEEK&apos;S STRETCH
                      </p>
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
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <>
            <div style={card}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontFamily: FF.mono, color: "#888", letterSpacing: "0.1em" }}>DISPLAY NAME</h3>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we greet you?"
                style={{ ...inputCss, marginBottom: 12 }}
              />
              <button
                type="button"
                onClick={saveName}
                disabled={nameBusy}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#e8e0d0",
                  padding: "10px 20px",
                  fontSize: 12,
                  fontFamily: FF.mono,
                  letterSpacing: "0.08em",
                  borderRadius: 6,
                  cursor: nameBusy ? "wait" : "pointer",
                }}
              >
                {nameBusy ? "Saving…" : "Save name"}
              </button>
              {nameMsg && (
                <span style={{ marginLeft: 12, fontSize: 12, color: nameMsg === "Saved." ? "#6a8a6a" : "#c88" }}>{nameMsg}</span>
              )}
            </div>

            <div style={card}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontFamily: FF.mono, color: "#888", letterSpacing: "0.1em" }}>PASSWORD</h3>
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={{ display: "block", fontSize: 11, fontFamily: FF.mono, color: "#666", marginBottom: 6 }}>CURRENT</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={inputCss}
                />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={{ display: "block", fontSize: 11, fontFamily: FF.mono, color: "#666", marginBottom: 6 }}>NEW (min 8 characters)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={inputCss}
                />
              </label>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ display: "block", fontSize: 11, fontFamily: FF.mono, color: "#666", marginBottom: 6 }}>CONFIRM NEW</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputCss}
                />
              </label>
              <button
                type="button"
                onClick={savePassword}
                disabled={pwdBusy}
                style={{
                  background: "#e50914",
                  border: "none",
                  color: "#fff",
                  padding: "10px 22px",
                  fontSize: 12,
                  fontFamily: FF.mono,
                  letterSpacing: "0.1em",
                  borderRadius: 6,
                  cursor: pwdBusy ? "wait" : "pointer",
                }}
              >
                {pwdBusy ? "Updating…" : "Update password"}
              </button>
              {pwdMsg && (
                <p style={{ margin: "12px 0 0", fontSize: 12, color: pwdMsg === "Password updated." ? "#6a8a6a" : "#c88" }}>{pwdMsg}</p>
              )}
            </div>

            <div style={card}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontFamily: FF.mono, color: "#888", letterSpacing: "0.1em" }}>APP PREFERENCES</h3>
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={showBadgesOnHome} onChange={(e) => setShowBadgesOnHome(e.target.checked)} />
                <span style={{ fontSize: 13, color: "#bbb" }}>Show current rank on the library header</span>
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
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <option value="warn">Warn before big spoilers</option>
                  <option value="open">No extra spoiler filtering</option>
                </select>
              </div>
              <button
                type="button"
                onClick={savePreferences}
                disabled={prefBusy}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#e8e0d0",
                  padding: "10px 22px",
                  fontSize: 12,
                  fontFamily: FF.mono,
                  letterSpacing: "0.1em",
                  borderRadius: 6,
                  cursor: prefBusy ? "wait" : "pointer",
                }}
              >
                {prefBusy ? "Saving…" : "Save preferences"}
              </button>
              {prefMsg && (
                <span style={{ marginLeft: 12, fontSize: 12, color: prefMsg === "Saved." ? "#6a8a6a" : "#c88" }}>{prefMsg}</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
