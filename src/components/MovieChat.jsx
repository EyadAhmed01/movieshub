"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

export default function MovieChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const nextUser = { role: "user", content: text };
    const history = [...messages, nextUser];
    setMessages(history);
    setLoading(true);
    try {
      const { reply } = await apiJson("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 200,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "1px solid #3a2a20",
          background: "linear-gradient(145deg, #2a1810, #1a0f0a)",
          color: "#f0dcc8",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 8px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(229,9,20,0.15)",
          fontFamily: FF.display,
          lineHeight: 1,
        }}
        title={open ? "Close Mr Potato" : "Open Mr Potato (AI movie chat)"}
      >
        {open ? "×" : "🥔"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Mr Potato chat"
          style={{
            position: "fixed",
            bottom: 94,
            right: 24,
            zIndex: 199,
            width: "min(400px, calc(100vw - 32px))",
            maxHeight: "min(520px, calc(100vh - 140px))",
            display: "flex",
            flexDirection: "column",
            background: "#12100e",
            border: "1px solid #2a2520",
            borderRadius: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
            overflow: "hidden",
            fontFamily: FF.sans,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #1f1c18",
              background: "rgba(229,9,20,0.08)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "#e50914",
                fontFamily: FF.mono,
                fontWeight: 600,
              }}
            >
              MR POTATO
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9a9088", lineHeight: 1.4 }}>
              Your AI spud for movies &amp; series. Not connected to your library unless you paste titles.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: "#5a524a", margin: 0, lineHeight: 1.5 }}>
                Try: &ldquo;What should I watch if I liked Arrival?&rdquo; or &ldquo;Who directed The Prestige?&rdquo;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: m.role === "user" ? "#f5f0e8" : "#d4cec4",
                  background: m.role === "user" ? "#2a2220" : "#1a1816",
                  border: `1px solid ${m.role === "user" ? "#3a3230" : "#252220"}`,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p style={{ fontSize: 11, color: "#665", fontFamily: FF.mono, margin: 0 }}>Mr Potato is thinking…</p>
            )}
            {error && (
              <p style={{ fontSize: 12, color: "#c44", margin: 0 }}>{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: 12, borderTop: "1px solid #1f1c18", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask about a film or show…"
              disabled={loading}
              style={{
                flex: 1,
                background: "#0c0a08",
                border: "1px solid #2a2520",
                borderRadius: 8,
                color: "#e8e0d8",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: FF.sans,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: "#e50914",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: "0 16px",
                fontSize: 11,
                fontFamily: FF.mono,
                fontWeight: 600,
                letterSpacing: "0.06em",
                cursor: loading || !input.trim() ? "default" : "pointer",
                opacity: loading || !input.trim() ? 0.45 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
