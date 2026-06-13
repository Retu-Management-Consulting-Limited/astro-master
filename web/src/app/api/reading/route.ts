import { NextResponse } from "next/server";
import { generateThemeRead, type ThemeId, THEME_IDS } from "@/lib/reading/theme";
import type { Chart } from "@/lib/astro/chart";
import { PERSONA, facts } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { cacheGet, cacheSet } from "@/lib/server/store";

export const runtime = "nodejs";
export const maxDuration = 120;

// Molly's real-master interpretations. Claude writes ONLY the prose — every
// astrological fact (signs, houses, the placement label) is computed
// deterministically from the user's real chart and passed in.
//
// Two auto-selected backends (see run()):
//   • ANTHROPIC_API_KEY set  → direct Anthropic API. Fast (~2-5s). PRODUCTION.
//   • no key                 → Agent SDK reusing the local Claude Code
//                              SUBSCRIPTION login. Slow (~40-90s). LOCAL PILOT ONLY
//                              — Anthropic does not permit claude.ai login to serve
//                              a product's end users; switch to a key before launch.
// A bounded in-memory cache makes repeat reads of the same chart instant.

interface AiCommon {
  lead?: string;
  paragraphs: { text: string; accent?: boolean; catch?: boolean }[];
  quote: string;
  chips: string[];
}

function firstPrompt(chart: Chart, nickname?: string): string {
  return `${nickname ? `用户昵称：${nickname}。\n` : ""}这是她的真实星盘事实：\n${facts(chart)}\n\n以 Molly 的口吻，为她写一段「第一次见面就被看穿」的解读。只输出如下 JSON，不要任何额外文字或代码块标记：
{
  "lead": "一句话开场，第二人称，直接戳中她（≤22字）",
  "paragraphs": [
    {"text": "第一段：她在人前的样子（≤55字）", "accent": false},
    {"text": "第二段：她真正怕的、藏起来的那一面（≤55字）", "accent": true},
    {"text": "第三段：把它翻成她的力量，温柔但有锋（≤55字）", "catch": true}
  ],
  "quote": "一句能让她想截图发朋友圈的金句（≤30字）",
  "chips": ["她此刻最想问的问题1", "问题2", "问题3"]
}`;
}

function themePrompt(chart: Chart, themeId: ThemeId, label: string, title: string, nickname?: string): string {
  return `${nickname ? `用户昵称：${nickname}。\n` : ""}主题：${title}。关键星位：${label}。\n她的整盘事实：\n${facts(chart)}\n\n围绕这个主题，以 Molly 的口吻写一段深度解读。只输出如下 JSON，不要任何额外文字或代码块标记：
{
  "paragraphs": [
    {"text": "这个主题在她身上怎么显现（≤55字）", "accent": false},
    {"text": "她在这里真正的恐惧/卡点（≤55字）", "accent": true},
    {"text": "把它翻成出路或力量，温柔有锋（≤55字）", "catch": true}
  ],
  "quote": "一句金句（≤30字）",
  "chips": ["顺着这个主题她最想问的1", "问题2"]
}`;
}

const run = (prompt: string, ac: AbortController) => runLLM(prompt, PERSONA, ac);

// A chart's reading is stable → cache it (KV in cloud, in-memory locally) so
// repeat taps / re-renders return instantly and don't re-bill.
function chartSig(chart: Chart): string {
  return chart.ascSign + "|" + chart.placements.map((p) => `${p.body}${p.sign}${p.house}`).join(",");
}

function parseAi(text: string): AiCommon {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
  if (!Array.isArray(json.paragraphs) || typeof json.quote !== "string") {
    throw new Error("bad AI shape");
  }
  return {
    lead: typeof json.lead === "string" ? json.lead : undefined,
    paragraphs: json.paragraphs.map((p: { text?: string; accent?: boolean; catch?: boolean }) => ({
      text: String(p.text ?? ""),
      accent: !!p.accent,
      catch: !!p.catch,
    })),
    quote: String(json.quote),
    chips: Array.isArray(json.chips) ? json.chips.map(String) : [],
  };
}

export async function POST(req: Request) {
  let body: { kind?: string; themeId?: string; chart?: Chart; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { kind, themeId, chart, nickname } = body;
  if (!chart?.placements) return NextResponse.json({ error: "missing chart" }, { status: 400 });

  if (kind === "theme" && (!themeId || !(THEME_IDS as string[]).includes(themeId))) {
    return NextResponse.json({ error: "bad themeId" }, { status: 400 });
  }

  const cacheKey = `${kind}:${themeId ?? ""}:${chartSig(chart)}`;
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) return NextResponse.json(cached);

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  try {
    let result: unknown;
    if (kind === "theme") {
      const scaffold = generateThemeRead(chart, themeId as ThemeId);
      const ai = parseAi(await run(themePrompt(chart, themeId as ThemeId, scaffold.planetLabel, scaffold.title, nickname), ac));
      // keep the deterministic structural facts, swap in Claude's prose
      result = { ...scaffold, paragraphs: ai.paragraphs, quote: ai.quote, chips: ai.chips };
    } else {
      const ai = parseAi(await run(firstPrompt(chart, nickname), ac));
      result = { ascSign: chart.ascSign, lead: ai.lead ?? "", paragraphs: ai.paragraphs, quote: ai.quote, chips: ai.chips };
    }
    await cacheSet(cacheKey, result).catch(() => {});
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
