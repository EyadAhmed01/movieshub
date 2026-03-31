"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FF } from "@/lib/fonts";
import BrandLogo from "@/components/BrandLogo";

const field = {
  background: "#0f0f0f",
  border: "1px solid #2a2a2a",
  color: "#e8e0d0",
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: FF.sans,
  outline: "none",
  width: "100%",
  letterSpacing: "0.02em",
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
      className="auth-shell"
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FF.sans,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <BrandLogo size={72} alt="Rotten Potatoes" />
        </div>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "#e50914",
            textTransform: "uppercase",
            marginBottom: 12,
            fontFamily: FF.mono,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Rotten Potatoes
        </p>
        <h1
          style={{
            fontFamily: FF.display,
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "#f5f0e8",
            margin: "0 0 28px",
            textAlign: "center",
          }}
        >
          Create account
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <p style={{ color: "#e50914", fontSize: 14, fontFamily: FF.sans, margin: 0, lineHeight: 1.4 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            style={{
              background: pending ? "#555" : "#e50914",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              padding: "14px 22px",
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: pending ? "wait" : "pointer",
              fontFamily: FF.mono,
              fontWeight: 600,
              marginTop: 4,
              transition: "background 0.15s ease",
            }}
          >
            {pending ? "…" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: 28, fontSize: 14, color: "#666", fontFamily: FF.sans, lineHeight: 1.5 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#e50914", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
