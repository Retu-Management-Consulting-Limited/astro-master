import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { PERSONA, facts } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

// Molly's live chat. Same dual-path backend as /api/reading (direct API when
// ANTHROPIC_API_KEY is set, else the local Claude Code subscription login).
// Conditioned on the user's real chart + the conversation so far.

interface Msg {
  from: "me" | "molly";
  text: string;
}

const CHAT_SYSTEM = `${PERSONA}

现在你在和她私聊（像微信对话）。回应要求：
- 简短：2-4 句，≤120 字，口语、有温度，像真人，不要长篇大论、不要分点。
- 紧扣她的星盘和她刚说的话；必要时温柔地点破，但先接住情绪。
- 不要任何免责声明、不要前后缀。只输出你要回她的那段话本身。`;

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();

function chatPrompt(chart: Chart, messages: Msg[], nickname?: string): string {
  const history = messages
    .map((m) => `${m.from === "me" ? "她" : "你(Molly)"}：${stripHtml(m.text)}`)
    .join("\n");
  return `${nickname ? `她的昵称：${nickname}。\n` : ""}她的星盘事实：\n${facts(chart)}\n\n你们的对话：\n${history}\n\n请你作为 Molly，回应她最后这句话。`;
}

export async function POST(req: Request) {
  let body: { chart?: Chart; nickname?: string; messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { chart, nickname, messages } = body;
  if (!chart?.placements) return NextResponse.json({ error: "missing chart" }, { status: 400 });
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "missing messages" }, { status: 400 });
  }

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  try {
    // cap history so the prompt stays bounded
    const recent = messages.slice(-12);
    const text = (await runLLM(chatPrompt(chart, recent, nickname), CHAT_SYSTEM, ac, 400)).trim();
    if (!text) return NextResponse.json({ error: "empty" }, { status: 500 });
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
