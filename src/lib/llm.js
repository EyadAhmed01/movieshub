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
