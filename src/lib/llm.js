const MOVIE_BOT_SYSTEM = `You are "Reel Llama", a friendly expert on films and television series. You answer questions about plots, directors, actors, awards, trivia, recommendations in general (not personal account data unless the user pastes it), and where to watch when you know it.

Rules:
- Stay on topic: movies, TV series, streaming, cinema history, and closely related culture.
- If you are unsure or information may be outdated, say so briefly instead of inventing facts.
- For spoilers, only give major twists if the user clearly wants spoilers; otherwise warn first.
- Keep answers concise unless the user asks for depth. Use short paragraphs or bullet lists when helpful.
- Do not claim to browse the live web unless tools are provided; you rely on your training knowledge.`;

export function movieChatSystemPrompt() {
  return MOVIE_BOT_SYSTEM;
}

/**
 * @param {{ role: string; content: string }[]} messages
 * @returns {Promise<string>}
 */
export async function runMovieChat(messages) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (provider === "ollama") {
    return runOllamaChat(messages);
  }
  return runGroqChat(messages);
}

async function runGroqChat(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set (or set LLM_PROVIDER=ollama for local Llama).");
  }
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: movieChatSystemPrompt() }, ...messages],
      temperature: 0.55,
      max_tokens: 1024,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(msg || "Groq request failed");
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return String(text).trim();
}

async function runOllamaChat(messages) {
  const base = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: movieChatSystemPrompt() }, ...messages],
      stream: false,
      options: { temperature: 0.55 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || res.statusText || "Ollama request failed");
  }
  const text = data?.message?.content;
  if (!text) throw new Error("Empty model response");
  return String(text).trim();
}

export function llmConfigured() {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (provider === "ollama") return true;
  return Boolean(process.env.GROQ_API_KEY);
}

const CAST_JSON_SYSTEM = `You output ONLY a JSON array. No markdown, no explanation.
Each element must be like {"name":"Actor Full Name"}.
Return at most 3 names: only the top-billed leads (stars), not supporting cast.
If you are not confident of the three biggest roles for this exact title, output [].
Never invent obscure credits; prefer [] over guessing.`;

function stripJsonFence(s) {
  let t = String(s || "").trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) t = m[1].trim();
  return t;
}

/**
 * LLM fallback when TMDB has no cast. Names may be wrong — mark inferred in DB.
 * @returns {Promise<{ name: string, id: null, inferred: true }[]>}
 */
export async function inferPrincipalCast({ title, year, mediaType }) {
  const kind = mediaType === "tv" ? "TV series" : "film";
  const yHint =
    year != null && Number.isFinite(Number(year)) ? ` Release / first-air year hint: ${year}.` : "";
  const user = `Work: "${title}" (${kind}).${yHint}
Return JSON array of at most 3 names — only the top-billed star leads (e.g. [{"name":"..."},{"name":"..."},{"name":"..."}]). Fewer than 3 is OK if unsure. If unknown return [].`;

  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  let raw;
  if (provider === "ollama") {
    raw = await runOllamaJsonCompletion(CAST_JSON_SYSTEM, user);
  } else {
    raw = await runGroqJsonCompletion(CAST_JSON_SYSTEM, user);
  }

  let parsed;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out = [];
  for (const x of parsed) {
    const name = typeof x === "string" ? x : x?.name;
    if (typeof name === "string" && name.trim().length > 1) {
      out.push({ name: name.trim(), id: null, inferred: true });
    }
  }
  return out.slice(0, 3);
}

async function runGroqJsonCompletion(system, user) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.15,
      max_tokens: 500,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Groq request failed");
  }
  const text = data?.choices?.[0]?.message?.content;
  return String(text || "").trim();
}

async function runOllamaJsonCompletion(system, user) {
  const base = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
      options: { temperature: 0.15 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Ollama request failed");
  return String(data?.message?.content || "").trim();
}
