import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { moneyPersona } from "@/lib/money/persona";
import { nextChapter } from "@/lib/money/narrative";
import { validateMoneyCopy } from "@/lib/money/guardrail";
import { MEANING_ZH } from "@/lib/money/types";
import type { Chapter, Precision } from "@/lib/money/types";
import { PERSONA, SAFETY, facts } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { detectCrisis } from "@/lib/ai/safety";
import { narrativeDayGet, narrativeDaySet, pushChapterLog, getChapterLog } from "@/lib/server/store";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { logUsage } from "@/lib/server/cost";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `${PERSONA}\n\n${SAFETY}`;

type Variant = "personalized" | "barnum";

function buildPrompt(chart: Chart, ch: Chapter, last: Chapter[], variant: Variant): string {
  const facet = MEANING_ZH[ch.meaningFacet];
  const recent = last.slice(0, 7).map((c) => c.hopeNote).join(" / ") || "（无）";
  if (variant === "barnum") {
    // H3 control: generic 今日财运, NO meaning personalization.
    return `以 Molly 的口吻，写今天的一句财运提醒（泛泛的、不针对具体人）。只输出 JSON，不要代码块：{"hopeNote":"≤55字","prophecy":"≤30字"}`;
  }
  return `这是她的真实星盘事实：\n${facts(chart)}\n
她的金钱人格：钱对她意味着「${facet.label}」（${facet.register}）。今天基调：${ch.tone}（旺/平/慎），叙事角度：${ch.angle}，故事拍子：${ch.arc.beat}。
近 7 天我已经说过：${recent}
要求：写「金钱故事」连载的今天这一页，承前一句、贴她的「${facet.label}」、希望为主调。绝不出现具体金额+日期。不要重复近 7 天的主题/比喻。只输出 JSON，不要代码块：
{"hopeNote":"承前+今天，≤55字","prophecy":"一句不报数字的预言，≤30字"}`;
}

function parse(text: string): { hopeNote: string; prophecy: string } {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  const j = JSON.parse(s >= 0 ? cleaned.slice(s, e + 1) : cleaned);
  return { hopeNote: String(j.hopeNote ?? ""), prophecy: String(j.prophecy ?? "") };
}

export async function POST(req: Request) {
  let body: { chart?: Chart; userId?: string; date?: string; variant?: Variant; precision?: Precision };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { chart, precision } = body;
  if (!chart?.placements) return NextResponse.json({ error: "missing chart" }, { status: 400 });

  const userId = body.userId || "anon";
  const date = body.date || new Date().toISOString().slice(0, 10);
  const variant: Variant = body.variant === "barnum" ? "barnum" : "personalized";

  const cached = await narrativeDayGet(userId, date, variant).catch(() => null);
  if (cached) return NextResponse.json(cached);

  const persona = moneyPersona(chart, precision ?? "exact");
  const last = (await getChapterLog(userId, 14).catch(() => [])) as Chapter[];
  const skeleton = nextChapter(persona, chart, new Date(`${date}T12:00:00Z`), last);
  const page = last.length + 1;

  // deterministic baseline (also the fallback if AI/guardrail/safety fail)
  let result: {
    page: number;
    variant: Variant;
    meaning: typeof persona.meaning;
    tone: Chapter["tone"];
    weight: Chapter["weight"];
    arc: Chapter["arc"];
    hopeNote: string;
    prophecy: Chapter["prophecy"];
    isDayOne: boolean;
    source: "deterministic" | "ai";
  } = {
    page,
    variant,
    meaning: persona.meaning,
    tone: skeleton.tone,
    weight: skeleton.weight,
    arc: skeleton.arc,
    hopeNote: skeleton.hopeNote,
    prophecy: skeleton.prophecy,
    isDayOne: page === 1,
    source: "deterministic",
  };

  // The daily engine uses the fast API path only (spec §4.1: haiku via API).
  // The Agent-SDK subscription path (~40-90s cold start) is unsuitable for a
  // per-day-per-user engine, so without a key we serve the deterministic
  // baseline instantly rather than block on the SDK.
  const useAI = !!process.env.ANTHROPIC_API_KEY;
  // rate-limit only the AI path; over limit → baseline (no cost), still cached.
  const id = await resolveIdentity(req);
  const rl = useAI ? await rateLimit(id, RULES.narrative()) : { ok: false as const };
  if (useAI && rl.ok) {
    const ac = new AbortController();
    req.signal.addEventListener("abort", () => ac.abort());
    try {
      const r = await runLLM(buildPrompt(chart, skeleton, last, variant), SYSTEM, ac, 400);
      if (r.usage) await logUsage({ route: "narrative", ...r.usage }).catch(() => {});
      const ai = parse(r.text);
      const clean = validateMoneyCopy(ai.hopeNote).ok && validateMoneyCopy(ai.prophecy).ok;
      const safe = !detectCrisis(ai.hopeNote) && !detectCrisis(ai.prophecy);
      if (clean && safe && ai.hopeNote) {
        result = {
          ...result,
          hopeNote: ai.hopeNote,
          prophecy: { ...skeleton.prophecy, text: ai.prophecy || skeleton.prophecy.text },
          source: "ai",
        };
      }
    } catch {
      /* keep deterministic baseline */
    }
  }

  await pushChapterLog(userId, skeleton).catch(() => {});
  await narrativeDaySet(userId, date, variant, result).catch(() => {});
  return NextResponse.json(result);
}
