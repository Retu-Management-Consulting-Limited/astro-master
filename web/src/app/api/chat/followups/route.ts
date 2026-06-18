import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { facts, pronoun, type Gender } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { buildFollowupPrompt, parseFollowups, fallbackFollowups, type Followup } from "@/lib/ai/followups";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { logUsage } from "@/lib/server/cost";

export const runtime = "nodejs";
export const maxDuration = 60;

// #4 follow-up questions for the chat. Fired AFTER the reply lands (separate call so
// the reply itself is never delayed). ALWAYS returns 3 follow-ups: the deterministic
// trust-graded fallback guarantees chips even when AI is off / rate-limited / errors.

interface Msg { from: "me" | "molly"; text: string }
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();

function clampTier(t: unknown): 0 | 1 | 2 {
  return t === 1 || t === 2 ? t : 0;
}

export async function POST(req: Request) {
  let body: { chart?: Chart; messages?: Msg[]; gender?: Gender; tier?: number; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { chart, messages, gender } = body;
  // locale 从 POST body 取（proxy 不注入到 API），hasLocale 校验，非法回退默认。
  const locale: AppLocale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  const tier = clampTier(body.tier);
  if (!isFullChart(chart)) return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "missing messages" }, { status: 400 });
  }

  const fallback = (extra?: object) => NextResponse.json({ followups: fallbackFollowups(tier), ...extra });

  // Light rate-limit; on limit just serve the deterministic fallback (never an error).
  const id = await resolveIdentity(req);
  const rl = await rateLimit(id, RULES.chat());
  if (!rl.ok) return fallback({ fallback: true });

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  try {
    const ta = pronoun(gender);
    const recent = messages.slice(-8);
    const history = recent.map((m) => `${m.from === "me" ? ta : "你(Molly)"}：${stripHtml(m.text)}`).join("\n");
    const prompt = buildFollowupPrompt(facts(chart, locale), history, ta, tier, locale);
    const r = await runLLM(prompt, "你只输出严格的 JSON 数组，不要任何解释或前后缀。", ac, 220, locale);
    if (r.usage) await logUsage({ route: "chat-followups", ...r.usage }).catch(() => {});
    const parsed: Followup[] = parseFollowups(r.text);
    if (parsed.length === 3) return NextResponse.json({ followups: parsed });
    return fallback({ fallback: true }); // partial/garbage → deterministic 3
  } catch {
    return fallback({ fallback: true });
  }
}
