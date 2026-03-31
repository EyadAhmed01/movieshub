"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const field = {
  background: "#0f0f0f",
  border: "1px solid #252525",
  color: "#d0ccc4",
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
  width: "100%",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    const origin = window.location.origin;
    const home = `${origin}/`;
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: home,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }
    if (res?.ok) {
      // Full navigation so the session cookie is always sent (fixes stuck loading on Vercel)
      window.location.assign(home);
      return;
    }
    setPending(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "#e50914",
            textTransform: "uppercase",
            marginBottom: 8,
            fontFamily: "monospace",
          }}
        >
          Viewing history
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: "#f5f0e8", margin: "0 0 24px" }}>Sign in</h1>
        {registered && (
          <p style={{ color: "#6a8f6a", fontSize: 13, marginBottom: 16, fontFamily: "monospace" }}>
            Account created. You can sign in now.
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
            required
          />
          {error && (
            <p style={{ color: "#e50914", fontSize: 12, fontFamily: "monospace", margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            style={{
              background: pending ? "#555" : "#e50914",
              border: "none",
              color: "#fff",
              padding: "12px 20px",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: pending ? "wait" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {pending ? "…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: "#555", fontFamily: "monospace" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "#e50914" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
