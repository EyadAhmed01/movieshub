"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FF } from "@/lib/fonts";
import BrandLogo from "@/components/BrandLogo";

const fieldBase = {
  background: "#0f0f0f",
  border: "1px solid #2a2a2a",
  color: "#e8e0d0",
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: FF.sans,
  outline: "none",
  width: "100%",
  letterSpacing: "0.02em",
  boxSizing: "border-box",
  borderRadius: 6,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

function emailLooksValid(s) {
  const t = s.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const next = { email: "", password: "" };
    if (!email.trim()) next.email = "Enter your email.";
    else if (!emailLooksValid(email)) next.email = "That doesn't look like a valid email.";
    if (!password) next.password = "Choose a password.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    setFieldErrors(next);
    if (next.email || next.password) return;

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
    if (!res.ok) {
      setPending(false);
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
      setPending(false);
      router.push("/login?registered=1");
      return;
    }
    if (sign?.ok) {
      window.location.assign(home);
      return;
    }
    setPending(false);
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
          <BrandLogo size={84} alt="Rotten Potatoes" />
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
        <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <input
              type="text"
              autoComplete="name"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={fieldBase}
            />
          </div>
          <div>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "signup-email-err" : undefined}
              style={{
                ...fieldBase,
                borderColor: fieldErrors.email ? "#9a3038" : fieldBase.border,
                boxShadow: fieldErrors.email ? "0 0 0 2px rgba(229, 9, 20, 0.2)" : "none",
              }}
            />
            {fieldErrors.email ? (
              <p id="signup-email-err" role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#e07070", fontFamily: FF.sans, lineHeight: 1.4 }}>
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "signup-password-err" : undefined}
              style={{
                ...fieldBase,
                borderColor: fieldErrors.password ? "#9a3038" : fieldBase.border,
                boxShadow: fieldErrors.password ? "0 0 0 2px rgba(229, 9, 20, 0.2)" : "none",
              }}
            />
            {fieldErrors.password ? (
              <p id="signup-password-err" role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#e07070", fontFamily: FF.sans, lineHeight: 1.4 }}>
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          {error && (
            <p
              role="alert"
              style={{
                color: "#e50914",
                fontSize: 14,
                fontFamily: FF.sans,
                margin: 0,
                lineHeight: 1.4,
                padding: "12px 14px",
                background: "rgba(229, 9, 20, 0.08)",
                border: "1px solid rgba(229, 9, 20, 0.35)",
                borderRadius: 8,
              }}
            >
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
              fontSize: pending ? 14 : 12,
              letterSpacing: pending ? "0.02em" : "0.14em",
              textTransform: pending ? "none" : "uppercase",
              cursor: pending ? "wait" : "pointer",
              fontFamily: pending ? FF.sans : FF.mono,
              fontWeight: pending ? 500 : 600,
              marginTop: 4,
              transition: "background 0.15s ease",
            }}
          >
            {pending ? "Signing up…" : "Sign up"}
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
