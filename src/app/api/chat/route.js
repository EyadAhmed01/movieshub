import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { llmConfigured, runMovieChat } from "@/lib/llm";

const MAX_LEN = 4000;
const MAX_USER_TURNS = 12;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!llmConfigured()) {
    return NextResponse.json(
      {
        error:
          "Chat is not configured. Set GROQ_API_KEY (default) or LLM_PROVIDER=ollama with Ollama running.",
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMessages = body?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }

  const trimmed = rawMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_USER_TURNS)
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").slice(0, MAX_LEN),
    }))
    .filter((m) => m.content.length > 0);

  if (trimmed.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  try {
    const reply = await runMovieChat(trimmed);
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
