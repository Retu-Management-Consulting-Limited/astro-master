import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { safetyFor, facts, personaFor, pronoun, type Gender } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { detectCrisis, crisisResponseFor, CHAT_FALLBACK } from "@/lib/ai/safety";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
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

function chatSystem(gender: Gender | undefined, ta: string, locale: AppLocale): string {
  if (locale === "ru") {
    return `${personaFor(gender, locale)}

Сейчас ты в личной переписке с человеком (как в мессенджере). Требования к ответу:
- Коротко: 2–4 фразы, до ~120 символов, разговорно, тепло, как живой человек; без длинных монологов и списков.
- Строго по её/его натальной карте и по тому, что он/она только что сказал(а); при необходимости мягко называй суть, но сначала прими чувства.
- Никаких дисклеймеров, никаких префиксов/суффиксов. Выводи только сам текст ответа.
- Пиши на русском языке.

${safetyFor(locale)}`;
  }
  return `${personaFor(gender, locale)}

现在你在和${ta}私聊（像微信对话）。回应要求：
- 简短：2-4 句，≤120 字，口语、有温度，像真人，不要长篇大论、不要分点。
- 紧扣${ta}的星盘和${ta}刚说的话；必要时温柔地点破，但先接住情绪。
- 不要任何免责声明、不要前后缀。只输出你要回${ta}的那段话本身。

${safetyFor(locale)}`;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();

function chatPrompt(chart: Chart, messages: Msg[], ta: string, locale: AppLocale, nickname?: string): string {
  const history = messages
    .map((m) => `${m.from === "me" ? ta : "你(Molly)"}：${stripHtml(m.text)}`)
    .join("\n");
  return `${nickname ? `${ta}的昵称：${nickname}。\n` : ""}${ta}的星盘事实：\n${facts(chart, locale)}\n\n你们的对话：\n${history}\n\n请你作为 Molly，回应${ta}最后这句话。`;
}

export async function POST(req: Request) {
  let body: { chart?: Chart; nickname?: string; messages?: Msg[]; gender?: Gender; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { chart, nickname, messages, gender } = body;
  // locale 从 POST body 取（proxy 不注入到 API），hasLocale 校验，非法回退默认。
  const locale: AppLocale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  if (!isFullChart(chart)) return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "missing messages" }, { status: 400 });
  }

  // 1) Crisis short-circuit — deterministic, BEFORE the model. Holds the feeling
  // and hands real help, never astrology.
  const lastUser = [...messages].reverse().find((m) => m.from === "me");
  if (lastUser && detectCrisis(stripHtml(lastUser.text), locale)) {
    return NextResponse.json({ text: crisisResponseFor(locale), crisis: true });
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
    const ta = pronoun(gender);
    const recent = messages.slice(-12); // bound the prompt
    const r = await runLLM(chatPrompt(chart, recent, ta, locale, nickname), chatSystem(gender, ta, locale), ac, 400, locale);
    if (r.usage) await logUsage({ route: "chat", ...r.usage }).catch(() => {});
    const text = r.text.trim();
    if (!text) return NextResponse.json({ text: CHAT_FALLBACK, fallback: true });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: CHAT_FALLBACK, fallback: true });
  }
}
