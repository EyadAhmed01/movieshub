"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FF } from "@/lib/fonts";
import WhatToWatchContent from "@/components/WhatToWatchContent";

export default function WhatToWatchPage() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#444", fontFamily: FF.mono, fontSize: 11, letterSpacing: "0.18em" }}>LOADING…</p>
      </div>
    );
  }

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
              <p style={{ fontSize: 10, letterSpacing: "0.22em", color: "#9a948a", fontFamily: FF.mono, margin: "0 0 8px" }}>
                PICKER
              </p>
              <h1 style={{ fontFamily: FF.display, fontSize: "clamp(26px, 6vw, 40px)", fontWeight: 400, margin: 0, color: "#f5f0e8" }}>
                What to watch?
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#6a6a6a", maxWidth: 520, lineHeight: 1.5 }}>
                Answer with the controls below. Reel Llama picks one title; we try to match it on TMDB so you can add it from{" "}
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
                ← Library
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
        <WhatToWatchContent />
      </main>
    </div>
  );
}
