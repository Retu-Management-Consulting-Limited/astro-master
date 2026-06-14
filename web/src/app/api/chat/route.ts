import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { PERSONA, SAFETY, facts } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { detectCrisis, CRISIS_RESPONSE, CHAT_FALLBACK } from "@/lib/ai/safety";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { logUsage } from "@/lib/server/cost";

export const runtime = "nodejs";
export const maxDuration = 120;

// Molly's live chat. Same dual-path backend as /api/reading. Guardrails:
//   1) crisis short-circuit — never let self-harm signals reach the LLM
//   2) rate limit per identity
//   3) graceful fallback on AI failure (never a 500 to the user)

interface Msg {
  from: "me" | "molly";
  text: string;
}

const CHAT_SYSTEM = `${PERSONA}

现在你在和她私聊（像微信对话）。回应要求：
- 简短：2-4 句，≤120 字，口语、有温度，像真人，不要长篇大论、不要分点。
- 紧扣她的星盘和她刚说的话；必要时温柔地点破，但先接住情绪。
- 不要任何免责声明、不要前后缀。只输出你要回她的那段话本身。

${SAFETY}`;

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

  // 1) Crisis short-circuit — deterministic, BEFORE the model. Holds the feeling
  // and hands real help, never astrology.
  const lastUser = [...messages].reverse().find((m) => m.from === "me");
  if (lastUser && detectCrisis(stripHtml(lastUser.text))) {
    return NextResponse.json({ text: CRISIS_RESPONSE, crisis: true });
  }

  // 2) Rate limit per identity.
  const id = await resolveIdentity(req);
  const rl = await rateLimit(id, RULES.chat());
  if (!rl.ok) {
    return NextResponse.json(
      { text: "今天聊得有点多啦，我先歇会儿——明天再来找我，好吗？", limited: true },
      { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined },
    );
  }

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  // 3) Model call with graceful fallback (never a 500 to the user).
  try {
    const recent = messages.slice(-12); // bound the prompt
    const r = await runLLM(chatPrompt(chart, recent, nickname), CHAT_SYSTEM, ac, 400);
    if (r.usage) await logUsage({ route: "chat", ...r.usage }).catch(() => {});
    const text = r.text.trim();
    if (!text) return NextResponse.json({ text: CHAT_FALLBACK, fallback: true });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: CHAT_FALLBACK, fallback: true });
  }
}
