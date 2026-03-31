"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not sign up.");
      return;
    }
    const origin = window.location.origin;
    const home = `${origin}/`;
    const sign = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: home,
    });
    if (sign?.error) {
      router.push("/login?registered=1");
      return;
    }
    if (sign?.ok) {
      window.location.assign(home);
      return;
    }
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
        <h1 style={{ fontSize: 26, fontWeight: 400, color: "#f5f0e8", margin: "0 0 24px" }}>Create account</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="text"
            autoComplete="name"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={field}
          />
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
            autoComplete="new-password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
            minLength={8}
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
            {pending ? "…" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: "#555", fontFamily: "monospace" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#e50914" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
