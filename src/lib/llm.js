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
Return only top-billed leads (stars), not day players; keep the count within the user's limit.
If you are not confident of real principal cast for this exact title, output [].
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
export async function inferPrincipalCast({ title, year, mediaType, maxNames = 3 }) {
  const cap = Math.min(12, Math.max(1, Number(maxNames) || 3));
  const kind = mediaType === "tv" ? "TV series" : "film";
  const yHint =
    year != null && Number.isFinite(Number(year)) ? ` Release / first-air year hint: ${year}.` : "";
  const user = `Work: "${title}" (${kind}).${yHint}
Return JSON array of at most ${cap} names — only top-billed principal cast (e.g. [{"name":"..."}]). Fewer is OK if unsure. If unknown return [].`;

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
  return out.slice(0, cap);
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
      max_tokens: 900,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Groq request failed");
  }
  const text = data?.choices?.[0]?.message?.content;
  return String(text || "").trim();
}

async function runOllamaJsonCompletion(system, user, temperature = 0.15) {
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
      options: { temperature },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Ollama request failed");
  return String(data?.message?.content || "").trim();
}

const WHAT_TO_WATCH_SYSTEM = `You are a film and TV recommendation engine. Output ONLY a single JSON object. No markdown fences, no extra text.
Keys (all required):
- "title": exact, real, well-known English release title (film or show name only, no episode titles).
- "mediaType": either "movie" or "tv" (lowercase).
- "genreLabel": one short genre label (e.g. "Sci-Fi thriller").
- "durationGuess": approximate runtime, e.g. "2h 15m" for a film or "~22 min per episode" / "~50 min per episode" for series.
- "description": 2–3 sentences pitching why it fits; no major spoilers.

Pick exactly ONE title that fits the user's mood (may be an emotional scale like "Very sad" through "Very happy"), genre preference, format, and tone. Use titles that exist in the real world.`;

function parseJsonObject(raw) {
  try {
    return JSON.parse(stripJsonFence(raw));
  } catch {
    return null;
  }
}

/**
 * @param {{ mood: string, genre: string, format: string, tone: string }} choices
 */
export async function suggestWhatToWatch(choices) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const user = `User choices (fixed options they picked):\n${JSON.stringify(choices, null, 2)}\n\nReturn the JSON object now.`;
  let raw;
  if (provider === "ollama") {
    raw = await runOllamaJsonCompletion(WHAT_TO_WATCH_SYSTEM, user, 0.45);
  } else {
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
          { role: "system", content: WHAT_TO_WATCH_SYSTEM },
          { role: "user", content: user },
        ],
        temperature: 0.45,
        max_tokens: 700,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || "Groq request failed");
    raw = String(data?.choices?.[0]?.message?.content || "").trim();
  }

  const obj = parseJsonObject(raw);
  if (!obj || typeof obj.title !== "string") {
    throw new Error("Model did not return valid JSON with a title");
  }
  const mediaType = obj.mediaType === "tv" ? "tv" : "movie";
  return {
    title: String(obj.title).trim(),
    mediaType,
    genreLabel: String(obj.genreLabel || "—").trim(),
    durationGuess: String(obj.durationGuess || "—").trim(),
    description: String(obj.description || "").trim(),
  };
}

const PROFILE_INSIGHT_SYSTEM = `You are Reel Llama, a witty film and TV buff. The user message is JSON with aggregate stats PLUS "tasteAnchors": { movies, series, movieAnchorMode, seriesAnchorMode, instruction }.

Output ONLY one JSON object. No markdown fences, no extra text.

Required keys:
- "tasteSummary": string, at most 2 short sentences. Must reflect patterns visible in tasteAnchors.movies and tasteAnchors.series (genres, years, mix of film vs TV). If displayName is set, you may use it once in tasteSummary or symbolicMonth.tagline only.
- "patternBullets": array of 3-4 short strings. Each bullet should be justified by the anchor lists or aggregate stats (e.g. recurring genres from those titles, era clustering, ratings if yourRatingOutOf10 appears).
- "blindSpot": one sentence: a real gap relative to what those anchors show (e.g. if everything is 2010s US drama, say so and name what's missing). Do not claim they watch something not implied by anchors+stats.
- "stretchGoal": one sentence: a concrete weekly challenge tied to blindSpot.
- "entryPick": object with "title" (real, famous work), "mediaType" ("movie" or "tv"), "why" (one sentence). The pick must address the blindSpot and MUST NOT duplicate any title in tasteAnchors.movies or tasteAnchors.series. Choose something outside their obvious cluster from the anchors.
- "symbolicMonth": object with "name" (exactly one English calendar month January…December), "tagline" (one funny PG line), "whyChosen" (2 short sentences). The month choice must be metaphorically justified by the SAME patterns you inferred from the anchor lists (mood, era mix, genre energy) — not random, not defaulting to the current calendar month unless it truly fits.

Hard rules:
- When naming titles the user clearly enjoys or watches, use ONLY titles from tasteAnchors.movies or tasteAnchors.series (or paraphrase "your top picks" without new names).
- Never invent ratings or titles they logged that are not in the anchors.
- entryPick.title must be a real release; must not appear in the anchor title lists.
- If anchors are very few, stay humble and generic where needed, but still tie blindSpot and month to what little is there.`;

function normalizeProfileInsight(obj) {
  if (!obj || typeof obj !== "object") return null;
  const patternBullets = Array.isArray(obj.patternBullets)
    ? obj.patternBullets.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 6)
    : [];
  const ep = obj.entryPick && typeof obj.entryPick === "object" ? obj.entryPick : {};
  const sm = obj.symbolicMonth && typeof obj.symbolicMonth === "object" ? obj.symbolicMonth : {};
  return {
    tasteSummary: String(obj.tasteSummary || "").trim(),
    patternBullets,
    blindSpot: String(obj.blindSpot || "").trim(),
    stretchGoal: String(obj.stretchGoal || "").trim(),
    entryPick: {
      title: String(ep.title || "").trim(),
      mediaType: ep.mediaType === "tv" ? "tv" : "movie",
      why: String(ep.why || "").trim(),
    },
    symbolicMonth: {
      name: String(sm.name || "").trim(),
      tagline: String(sm.tagline || "").trim(),
      whyChosen: String(sm.whyChosen || "").trim(),
    },
  };
}

/**
 * @param {{ stats: Record<string, unknown>, weekKey: string, monthKey: string, displayName?: string | null }} args
 * @returns {Promise<NonNullable<ReturnType<typeof normalizeProfileInsight>>>}
 */
export async function generateProfileInsights({ stats, weekKey, monthKey, displayName }) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const userPayload = {
    stats,
    refreshContext: { weekKey, monthKey },
    displayName: displayName || null,
  };
  const user = `Here is the JSON stats object:\n${JSON.stringify(userPayload, null, 2)}\n\nReturn the required JSON object now.`;

  let raw;
  if (provider === "ollama") {
    raw = await runOllamaJsonCompletion(PROFILE_INSIGHT_SYSTEM, user, 0.45);
  } else {
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
          { role: "system", content: PROFILE_INSIGHT_SYSTEM },
          { role: "user", content: user },
        ],
        temperature: 0.45,
        max_tokens: 1100,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || "Groq request failed");
    raw = String(data?.choices?.[0]?.message?.content || "").trim();
  }

  const parsed = parseJsonObject(raw);
  const normalized = normalizeProfileInsight(parsed);
  if (!normalized || !normalized.tasteSummary) {
    throw new Error("Model did not return valid profile insight JSON");
  }
  return normalized;
}
