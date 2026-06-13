import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { generateThemeRead, type ThemeId, THEME_IDS } from "@/lib/reading/theme";
import type { Chart } from "@/lib/astro/chart";

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

const PLANET_ZH: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
};
const HOUSE_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function facts(chart: Chart): string {
  const lines = chart.placements
    .filter((p) => PLANET_ZH[p.body])
    .map((p) => `${PLANET_ZH[p.body]}落${p.sign}，第${HOUSE_ZH[p.house] ?? p.house}宫`);
  const asp = (chart.aspects ?? [])
    .slice(0, 4)
    .map((a) => `${PLANET_ZH[a.a] ?? a.a} ${a.type} ${PLANET_ZH[a.b] ?? a.b}`);
  return `上升${chart.ascSign}。\n${lines.join("；")}。${asp.length ? `\n主要相位：${asp.join("；")}。` : ""}`;
}

const PERSONA = `你是 Molly——一位能「看穿本命」的占星向导。你的声音：
- 第二人称「你」，像一个比她自己更懂她的人在低声说话。
- 精准、有体温、带一点钝痛感；先戳中她藏起来的那一面，再把它翻译成力量。
- 句子短、有画面、有情绪；绝不写星座专栏式的空话或万能套话。
- 一定紧扣我给你的真实星盘事实来写，不要编造任何星位。
- 简体中文。解读正文里不要出现任何免责声明。`;

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

const MODEL_ALIAS = (process.env.MOLLY_MODEL || "sonnet").toLowerCase();
const MODEL_ID: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};
const USE_API = !!process.env.ANTHROPIC_API_KEY;

// PROD path: direct Anthropic API. Fast (~2-5s). Used whenever an API key is set.
async function runViaApi(prompt: string, ac: AbortController): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const msg = await client.messages.create(
    {
      model: MODEL_ID[MODEL_ALIAS] ?? MODEL_ID.sonnet,
      max_tokens: 1024,
      system: PERSONA,
      messages: [{ role: "user", content: prompt }],
    },
    { signal: ac.signal },
  );
  return msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

// PILOT path: Agent SDK reusing the local Claude Code subscription login (no API
// key). Slow (~40-90s: SDK cold-starts an engine subprocess per call).
async function runViaAgentSdk(prompt: string, abortController: AbortController): Promise<string> {
  let out = "";
  for await (const m of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
      model: MODEL_ALIAS,
      systemPrompt: PERSONA,
      // Pure completion: don't load this workspace's CLAUDE.md / settings / MCP.
      settingSources: [],
      mcpServers: {},
      cwd: tmpdir(),
      // Kill the engine subprocess if the client disconnects.
      abortController,
    },
  })) {
    if (m.type === "result") out = (m as { result?: string }).result ?? "";
  }
  return out;
}

// Auto-select: API key present → direct API; otherwise → subscription via SDK.
function run(prompt: string, ac: AbortController): Promise<string> {
  return USE_API ? runViaApi(prompt, ac) : runViaAgentSdk(prompt, ac);
}

// Bounded in-memory cache: a chart's reading is stable, so repeat taps /
// re-renders return instantly (and don't re-bill). Keyed by chart signature.
const CACHE = new Map<string, unknown>();
const CACHE_MAX = 500;
function chartSig(chart: Chart): string {
  return chart.ascSign + "|" + chart.placements.map((p) => `${p.body}${p.sign}${p.house}`).join(",");
}
function cacheGet(key: string): unknown {
  const v = CACHE.get(key);
  if (v !== undefined) {
    CACHE.delete(key); // LRU bump
    CACHE.set(key, v);
  }
  return v;
}
function cacheSet(key: string, value: unknown): void {
  CACHE.set(key, value);
  if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
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
  const cached = cacheGet(cacheKey);
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
    cacheSet(cacheKey, result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
