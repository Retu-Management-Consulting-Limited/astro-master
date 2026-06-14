# Money Mirror Slice 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the thinnest vertical slice that lets Molly hook users with "钱对你意味着什么" + a daily serialized money narrative, instrumented to test hypotheses H1/H2/H3 — without building paywall/blueprint/full-calendar/share/seam.

**Architecture:** New pure `web/src/lib/money/` domain (deterministic, TDD'd): `persona.ts` (chart → money-meaning with 主/次 tension + precision), `narrative.ts` (deterministic Chapter skeleton: arc + mixed cadence + themeKey dedup + prophecy with NO amount×date), `behavior.ts` (signals → refine meaning belief), `guardrail.ts` (money red-line copy validator). One route `/api/narrative` renders AI prose (haiku) around the deterministic skeleton, day-caches in KV, falls back to the deterministic skeleton on any AI/guardrail/safety failure. Reuses existing `lib/ai/llm.ts`, `lib/ai/molly.ts`, `lib/ai/safety.ts`, `lib/server/store.ts`, `lib/server/ratelimit.ts`, `lib/server/cost.ts`, `lib/track.ts`. UI lifts exact styling/copy from `design/19-money-mirror.html`.

**Tech Stack:** Next.js 16 (modified — see Task 0) + React 19 + TypeScript + Bun + Tailwind 4 + astronomy-engine + Upstash KV (memory fallback) + Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-06-14-money-mirror-financial-entry-design.md` (v4). **UI source of truth:** `design/19-money-mirror.html` (9 screens).

**Working dir for all commands:** `cd "/Users/ddd/Documents/Claude/astro-master/web"`. Run tests with `./node_modules/.bin/vitest run <path>`. Commit after each task.

---

## Phase 0 — Setup & shared types

### Task 0: Orient & create the money domain skeleton

**Files:**
- Read only: `web/AGENTS.md`, `web/src/lib/astro/chart.ts`, `web/src/lib/ai/molly.ts`, `web/src/lib/ai/safety.ts`, `design/19-money-mirror.html`
- Create: `web/src/lib/money/types.ts`

- [ ] **Step 1: Read the modified-Next warning.** Open `web/AGENTS.md`. It says this Next.js differs from training data; before writing any route/page code (Phase 5 & 7) read the relevant file under `web/node_modules/next/dist/docs/`. Note it; no code yet.

- [ ] **Step 2: Confirm reuse targets exist.** Run:
```bash
ls src/lib/ai/safety.ts src/lib/server/store.ts src/lib/server/ratelimit.ts src/lib/server/cost.ts src/lib/track.ts
```
Expected: all five paths print (no "No such file"). These are reused, NOT recreated.

- [ ] **Step 3: Create the shared types file** `web/src/lib/money/types.ts`:
```ts
import type { Chart } from "@/lib/astro/chart";

export type MeaningKey = "security" | "status" | "freedom" | "worth" | "control" | "care";
export const MEANING_KEYS: MeaningKey[] = ["security", "status", "freedom", "worth", "control", "care"];

// zh label + the emotional register each meaning speaks to (used by narrative coloring)
export const MEANING_ZH: Record<MeaningKey, { label: string; register: string }> = {
  security: { label: "安全", register: "踏实、不慌、有底气" },
  status:   { label: "地位", register: "被看得起、不掉队、拉开身位" },
  freedom:  { label: "自由", register: "不被困、能选、敢转向" },
  worth:    { label: "我配得上", register: "我值得、可以对自己好" },
  control:  { label: "掌控", register: "主动权、掌握自己的命" },
  care:     { label: "护住所爱", register: "照顾家人、被爱、安顿" },
};

export type Precision = "exact" | "approx" | "no-time";
export type MeaningRelation = "tension" | "reinforce";

export interface Meaning {
  primary: MeaningKey;
  secondary: MeaningKey;
  relation: MeaningRelation;
}

export interface MoneyPersona {
  meaning: Meaning;
  precision: Precision;
  scores: Record<MeaningKey, number>; // raw scores, exposed for tests/transparency
  strengths: string[]; // 2–4 短语
  blindSpot: string;   // 天赋暗面 framing (甩锅星盘)
  styleTag: string;    // e.g. 冲动扩张型
}

export type Tone = "wang" | "ping" | "shen";
export type ProphecyType = "window" | "destiny" | "conditional" | "texture";
export type Angle = "opportunity" | "caution" | "recap" | "contrast" | "identity";
export type Weight = "heavy" | "light" | "recap";
export type Beat = "setup" | "tension" | "turn" | "integrate";

// NOTE: Prophecy has NO {amount,date} fields — "不报数字" is enforced at the type level.
export interface Prophecy {
  type: ProphecyType;
  text: string;
}

export interface Chapter {
  transitKey: string;     // which transit drives this page
  tone: Tone;             // 旺/平/慎
  meaningFacet: MeaningKey;
  prophecyType: ProphecyType;
  angle: Angle;
  themeKey: string;       // transitKey + meaningFacet + prophecyType — dedup unit
  weight: Weight;         // heavy(真行运) / light(平淡日) / recap(回顾整合)
  arc: { seasonKey: string; beat: Beat };
  hopeNote: string;       // deterministic prose (AI may rewrite; this is the fallback)
  prophecy: Prophecy;
}

export type { Chart };
```

- [ ] **Step 4: Typecheck.** Run: `bun run typecheck`
Expected: PASS (no errors). If `bun run typecheck` is missing, use `./node_modules/.bin/tsc --noEmit`.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/types.ts
git commit -m "feat(money): shared types for Money Mirror Slice 0 (meaning/chapter/prophecy)"
```

---

## Phase 1 — `persona.ts` (chart → money-meaning)

### Task 1: Meaning scoring from the chart (2/8 house + money planets)

**Files:**
- Create: `web/src/lib/money/persona.ts`
- Test: `web/src/lib/money/persona.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/persona.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona, scoreMeanings } from "./persona";
import { MEANING_KEYS } from "./types";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

describe("money persona", () => {
  it("scores every meaning key (finite, non-negative)", () => {
    const s = scoreMeanings(chart);
    for (const k of MEANING_KEYS) {
      expect(typeof s[k]).toBe("number");
      expect(s[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic — same chart → identical persona", () => {
    expect(moneyPersona(chart)).toEqual(moneyPersona(chart));
  });

  it("primary != secondary, both valid keys", () => {
    const p = moneyPersona(chart);
    expect(p.meaning.primary).not.toBe(p.meaning.secondary);
    expect(MEANING_KEYS).toContain(p.meaning.primary);
    expect(MEANING_KEYS).toContain(p.meaning.secondary);
  });

  it("relation is tension when primary/secondary are opposed, else reinforce", () => {
    const p = moneyPersona(chart);
    expect(["tension", "reinforce"]).toContain(p.meaning.relation);
  });

  it("precision defaults to exact, degrades to no-time", () => {
    expect(moneyPersona(chart).precision).toBe("exact");
    expect(moneyPersona(chart, "no-time").precision).toBe("no-time");
  });

  it("emits 2–4 strengths, a blindSpot, a styleTag", () => {
    const p = moneyPersona(chart);
    expect(p.strengths.length).toBeGreaterThanOrEqual(2);
    expect(p.strengths.length).toBeLessThanOrEqual(4);
    expect(p.blindSpot.length).toBeGreaterThan(0);
    expect(p.styleTag.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/persona.test.ts`
Expected: FAIL ("moneyPersona is not a function" / cannot find module).

- [ ] **Step 3: Write the implementation** `web/src/lib/money/persona.ts`:
```ts
import type { Chart, Placement } from "@/lib/astro/chart";
import { MEANING_KEYS, MEANING_ZH, type MeaningKey, type Meaning, type MoneyPersona, type Precision } from "./types";

// signIndex: 0白羊 1金牛 2双子 3巨蟹 4狮子 5处女 6天秤 7天蝎 8射手 9摩羯 10水瓶 11双鱼
// Each meaning gets weighted points from: planets in the money houses (2/8),
// planets ruling money, and sign emphasis. Deterministic, no I/O.
const SIGN_MEANING: Record<number, MeaningKey> = {
  1: "security", 3: "care", 4: "status", 7: "control", 8: "freedom", 9: "control",
  10: "freedom", 6: "worth", // 天秤→worth(金星)
};
const PLANET_MEANING: Partial<Record<string, MeaningKey>> = {
  Saturn: "security", Moon: "care", Sun: "status", Jupiter: "freedom",
  Venus: "worth", Pluto: "control", Uranus: "freedom", Mars: "freedom",
};
// pairs that pull against each other → relation = tension
const OPPOSED: [MeaningKey, MeaningKey][] = [
  ["freedom", "security"], ["status", "care"], ["control", "worth"],
];

export function scoreMeanings(chart: Chart): Record<MeaningKey, number> {
  const s = Object.fromEntries(MEANING_KEYS.map((k) => [k, 0])) as Record<MeaningKey, number>;
  const add = (k: MeaningKey | undefined, n: number) => { if (k) s[k] += n; };
  for (const p of chart.placements as Placement[]) {
    const inMoneyHouse = p.house === 2 || p.house === 8;
    const planetMeaning = PLANET_MEANING[p.body];
    const signMeaning = SIGN_MEANING[p.signIndex];
    // money-house occupants count most; the money planets always count; sign tints.
    if (inMoneyHouse) { add(planetMeaning, 3); add(signMeaning, 2); }
    add(planetMeaning, 1.5);
    add(signMeaning, 0.5);
  }
  // 2nd-house sign ruler emphasis: the sign on the 2nd cusp (whole-sign: ascSignIndex+1)
  const secondSign = (chart.ascSignIndex + 1) % 12;
  add(SIGN_MEANING[secondSign], 2);
  return s;
}

function topTwo(scores: Record<MeaningKey, number>): [MeaningKey, MeaningKey] {
  // deterministic tie-break by MEANING_KEYS order
  const ordered = [...MEANING_KEYS].sort((a, b) => (scores[b] - scores[a]) || (MEANING_KEYS.indexOf(a) - MEANING_KEYS.indexOf(b)));
  return [ordered[0], ordered[1]];
}

function relationOf(primary: MeaningKey, secondary: MeaningKey): Meaning["relation"] {
  const opposed = OPPOSED.some(([a, b]) => (a === primary && b === secondary) || (b === primary && a === secondary));
  return opposed ? "tension" : "reinforce";
}

function styleFor(primary: MeaningKey, chart: Chart): string {
  const fast = chart.placements.some((p) => p.body === "Mars" && (p.house === 2 || p.house === 8));
  const base = { freedom: "扩张", security: "守成", status: "进取", worth: "随心", control: "掌局", care: "顾家" }[primary];
  return `${fast ? "冲动" : "稳健"}${base}型`;
}

function strengthsFor(primary: MeaningKey, secondary: MeaningKey): string[] {
  const lib: Record<MeaningKey, string> = {
    freedom: "敢出手", security: "稳得住", status: "格局大", worth: "嗅觉准", control: "看得透", care: "扛得起",
  };
  return [lib[primary], lib[secondary], "敢转向"];
}

function blindSpotFor(primary: MeaningKey): string {
  const map: Record<MeaningKey, string> = {
    freedom: "你为情绪买单——因为你比别人更敢爱、更敢活。这不是你的错，是你火星的位置。",
    security: "你太想稳，反而错过——这不是胆小，是你太想护住所有人。",
    status: "你怕掉队，容易为面子花——那股劲用对地方，就是你的引擎。",
    worth: "你舍不得对自己好，又忍不住补偿式消费——你只是还没真信自己配得上。",
    control: "你想抓住一切，反被钱绑住——你的深，是天赋也是重量。",
    care: "你把钱都给了别人，留给自己的最少——你的付出，也该有人接住。",
  };
  return map[primary];
}

export function moneyPersona(chart: Chart, precision: Precision = "exact"): MoneyPersona {
  const scores = scoreMeanings(chart);
  const [primary, secondary] = topTwo(scores);
  const meaning: Meaning = { primary, secondary, relation: relationOf(primary, secondary) };
  return {
    meaning,
    precision,
    scores,
    strengths: strengthsFor(primary, secondary),
    blindSpot: blindSpotFor(primary),
    styleTag: styleFor(primary, chart),
  };
}

export { MEANING_ZH };
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/persona.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/persona.ts src/lib/money/persona.test.ts
git commit -m "feat(money): persona.ts — chart → money-meaning (主/次 tension + precision)"
```

---

## Phase 2 — `guardrail.ts` (money red-line copy validator)

### Task 2: validateMoneyCopy blocks amount×date / shame / gambling

**Files:**
- Create: `web/src/lib/money/guardrail.ts`
- Test: `web/src/lib/money/guardrail.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/guardrail.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateMoneyCopy } from "./guardrail";

describe("money guardrail", () => {
  it("BLOCKS a falsifiable amount × future-date prophecy", () => {
    expect(validateMoneyCopy("你明年会赚 50 万").ok).toBe(false);
    expect(validateMoneyCopy("3个月内进账 8000 元").ok).toBe(false);
  });
  it("BLOCKS shame copy", () => {
    expect(validateMoneyCopy("你这样下去会越来越穷").ok).toBe(false);
    expect(validateMoneyCopy("再不理财你就完了").ok).toBe(false);
  });
  it("BLOCKS gambling/speculation incitement", () => {
    expect(validateMoneyCopy("今天就该梭哈，敢赌一把").ok).toBe(false);
    expect(validateMoneyCopy("加杠杆冲一波").ok).toBe(false);
  });
  it("PASSES safe hope/agency copy (no number, no shame, no gambling)", () => {
    expect(validateMoneyCopy("9到11月是你最旺的扩张窗口，敢往前一步胜算偏高").ok).toBe(true);
    expect(validateMoneyCopy("你这辈子的钱，靠一次敢转向").ok).toBe(true);
  });
  it("PASSES a magnitude texture without a number", () => {
    expect(validateMoneyCopy("不是小数目，是够你喘口气的一笔").ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/guardrail.test.ts`
Expected: FAIL (cannot find `validateMoneyCopy`).

- [ ] **Step 3: Write the implementation** `web/src/lib/money/guardrail.ts`:
```ts
export interface GuardResult { ok: boolean; reason?: string; }

// A money amount: digits (incl. 万/千/k) optionally with currency.
const AMOUNT = /(\d[\d,\.]*\s*(万|千|百万|元|块|w|k|\$|￥|美元|刀))|([￥\$]\s*\d)/i;
// A future time reference near text.
const FUTURE = /(明年|下个?月|今年|年底|年内|个?月内|周内|天内|下半年|未来)/;
const SHAME = /(越来越穷|会更穷|你就完了|你这样下去|活该|没救|丢人现眼|一事无成)/;
const GAMBLE = /(梭哈|敢赌|赌一把|杠杆|满仓|押注一把|all\s*in|搏一搏|冲一波|抄底一把|彩票|博一把)/i;

export function validateMoneyCopy(text: string): GuardResult {
  if (AMOUNT.test(text) && FUTURE.test(text)) return { ok: false, reason: "amount×date 可证伪硬预测" };
  if (AMOUNT.test(text) && /(赚|进账|收入|到手|赢)/.test(text)) return { ok: false, reason: "金额收益硬预测" };
  if (SHAME.test(text)) return { ok: false, reason: "羞耻句式" };
  if (GAMBLE.test(text)) return { ok: false, reason: "赌性/投机怂恿" };
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/guardrail.test.ts`
Expected: PASS (5 tests). If the "magnitude texture" case fails because of a stray digit, confirm the test string has no digits — it must pass.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/guardrail.ts src/lib/money/guardrail.test.ts
git commit -m "feat(money): guardrail.ts — block amount×date / shame / gambling copy"
```

---

## Phase 3 — `narrative.ts` (deterministic Chapter skeleton)

### Task 3: nextChapter — tone from transits, meaning coloring, prophecy (no number)

**Files:**
- Create: `web/src/lib/money/narrative.ts`
- Test: `web/src/lib/money/narrative.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/narrative.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona } from "./persona";
import { nextChapter, seasonKeyFor } from "./narrative";
import { validateMoneyCopy } from "./guardrail";
import type { Chapter } from "./types";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);
const persona = moneyPersona(chart);

function chapterOn(d: number, last: Chapter[] = []) {
  return nextChapter(persona, chart, new Date(Date.UTC(2026, 5, d, 12, 0)), last);
}

describe("money narrative", () => {
  it("is deterministic — same inputs → identical chapter", () => {
    expect(chapterOn(13)).toEqual(chapterOn(13));
  });

  it("never emits an amount×date in hopeNote or prophecy (不报数字)", () => {
    for (let d = 1; d <= 28; d++) {
      const c = chapterOn(d);
      expect(validateMoneyCopy(c.hopeNote).ok).toBe(true);
      expect(validateMoneyCopy(c.prophecy.text).ok).toBe(true);
      // structural: Prophecy type has no amount/date keys
      expect(Object.keys(c.prophecy).sort()).toEqual(["text", "type"]);
    }
  });

  it("colors by meaning — facet is the persona's primary or secondary", () => {
    const c = chapterOn(13);
    expect([persona.meaning.primary, persona.meaning.secondary]).toContain(c.meaningFacet);
  });

  it("rotates angle to avoid repeating a recent themeKey", () => {
    const first = chapterOn(13);
    // feed the same chapter back as 'recent'; same transit must rotate angle
    const second = nextChapter(persona, chart, new Date(Date.UTC(2026, 5, 13, 12, 0)), [first]);
    if (second.themeKey === first.themeKey) {
      expect(second.angle).not.toBe(first.angle);
    } else {
      expect(second.themeKey).not.toBe(first.themeKey);
    }
  });

  it("assigns a weight (heavy/light/recap) and an arc beat", () => {
    const c = chapterOn(13);
    expect(["heavy", "light", "recap"]).toContain(c.weight);
    expect(["setup", "tension", "turn", "integrate"]).toContain(c.arc.beat);
    expect(c.arc.seasonKey).toBe(seasonKeyFor(new Date(Date.UTC(2026, 5, 13, 12, 0))));
  });

  it("tone varies across a month (not all identical)", () => {
    const tones = new Set(Array.from({ length: 28 }, (_, i) => chapterOn(i + 1).tone));
    expect(tones.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/narrative.test.ts`
Expected: FAIL (cannot find `nextChapter`).

- [ ] **Step 3: Write the implementation** `web/src/lib/money/narrative.ts`:
```ts
import { bodyLongitude, type Chart } from "@/lib/astro/chart";
import { wealthScore, wealthLevel } from "@/lib/astro/wealth";
import { MEANING_ZH, type MeaningKey, type MoneyPersona } from "./types";
import type { Angle, Beat, Chapter, Prophecy, ProphecyType, Tone, Weight } from "./types";

const ANGLES: Angle[] = ["opportunity", "caution", "recap", "contrast", "identity"];

// A "season" = a month bucket here (Slice 0 proxy for a major-transit arc).
export function seasonKeyFor(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}
function beatFor(date: Date): Beat {
  const dom = date.getUTCDate();
  if (dom <= 7) return "setup";
  if (dom <= 16) return "tension";
  if (dom <= 24) return "turn";
  return "integrate";
}

// Day "weight": how much real astrological material there is.
// heavy = strong (旺/慎) transit; recap on integrate beat's quiet days; else light.
function weightFor(tone: Tone, beat: Beat): Weight {
  if (tone !== "ping") return "heavy";
  if (beat === "integrate") return "recap";
  return "light";
}

// Pick which meaning facet to color today with: alternate primary/secondary by day
// parity so a tension persona hears both sides over time.
function facetFor(persona: MoneyPersona, date: Date): MeaningKey {
  return date.getUTCDate() % 2 === 0 ? persona.meaning.primary : persona.meaning.secondary;
}

function prophecyTypeFor(tone: Tone, beat: Beat): ProphecyType {
  if (beat === "setup") return "destiny";
  if (beat === "integrate") return "texture";
  return tone === "wang" ? "window" : "conditional";
}

// Deterministic transit key: dominant aspect of the Moon today (cheap, varies daily).
function transitKeyFor(chart: Chart, date: Date): string {
  const moon = bodyLongitude("Moon", date);
  const idx = Math.floor(moon / 30); // moon sign index 0..11
  return `moon${idx}`;
}

// Deterministic prose (the AI route may rewrite richer; this is the safe fallback).
// Colored by meaning register; NEVER contains a number+date (guardrail-clean).
function composeHope(facet: MeaningKey, tone: Tone): string {
  const reg = MEANING_ZH[facet].register;
  if (tone === "wang") return `今天有股顺风——对你这种把钱看作「${MEANING_ZH[facet].label}」的人，正是往「${reg}」再走一步的时候。`;
  if (tone === "shen") return `今天先稳着。你的钱容易跟着情绪走，我替你拦一下——「${reg}」不急在这一天。`;
  return `平常的一天。把「${reg}」放在心上，小事上对自己好一点就够了。`;
}
function composeProphecy(type: ProphecyType, facet: MeaningKey): Prophecy {
  const label = MEANING_ZH[facet].label;
  const text: Record<ProphecyType, string> = {
    window: `这阵子是你靠近「${label}」最顺的窗口，开着。`,
    destiny: `你这辈子的钱，不靠死工资，靠一次敢转向——朝「${label}」的方向。`,
    conditional: `这段你要是守住自己，慢慢会看见「${label}」一点点长出来。`,
    texture: `不是小数目，是够你喘口气、离「${label}」更近的一笔。`,
  };
  return { type, text: text[type] };
}

export function nextChapter(persona: MoneyPersona, chart: Chart, date: Date, lastChapters: Chapter[] = []): Chapter {
  const score = wealthScore(chart, date);
  const tone = wealthLevel(score) as Tone;
  const beat = beatFor(date);
  const facet = facetFor(persona, date);
  const prophecyType = prophecyTypeFor(tone, beat);
  const transitKey = transitKeyFor(chart, date);

  const baseTheme = `${transitKey}|${facet}|${prophecyType}`;
  // anti-repeat: if this themeKey appeared in the last 14 chapters, rotate angle.
  const recent = lastChapters.slice(0, 14);
  const usedAnglesForTheme = new Set(recent.filter((c) => c.themeKey === baseTheme).map((c) => c.angle));
  const defaultAngle: Angle = tone === "wang" ? "opportunity" : tone === "shen" ? "caution" : "identity";
  const angle = usedAnglesForTheme.has(defaultAngle)
    ? (ANGLES.find((a) => !usedAnglesForTheme.has(a)) ?? defaultAngle)
    : defaultAngle;

  return {
    transitKey,
    tone,
    meaningFacet: facet,
    prophecyType,
    angle,
    themeKey: baseTheme,
    weight: weightFor(tone, beat),
    arc: { seasonKey: seasonKeyFor(date), beat },
    hopeNote: composeHope(facet, tone),
    prophecy: composeProphecy(prophecyType, facet),
  };
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/narrative.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/narrative.ts src/lib/money/narrative.test.ts
git commit -m "feat(money): narrative.ts — deterministic Chapter (arc + cadence + themeKey dedup + no-number prophecy)"
```

---

## Phase 4 — `behavior.ts` (越用越准 learning belief)

### Task 4: refineMeaning from explicit + implicit signals

**Files:**
- Create: `web/src/lib/money/behavior.ts`
- Test: `web/src/lib/money/behavior.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/behavior.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { initBelief, refineMeaning, beliefToMeaning, type MeaningBelief } from "./behavior";
import type { MoneyPersona } from "./types";

const persona: MoneyPersona = {
  meaning: { primary: "freedom", secondary: "security", relation: "tension" },
  precision: "exact",
  scores: { security: 4, status: 1, freedom: 6, worth: 2, control: 1, care: 0 },
  strengths: ["敢出手"], blindSpot: "x", styleTag: "冲动扩张型",
};

describe("behavior learning", () => {
  it("seeds belief from the persona's chart scores", () => {
    const b = initBelief(persona);
    expect(b.scores.freedom).toBeGreaterThan(b.scores.care);
    expect(b.confidence).toBeGreaterThanOrEqual(0);
    expect(b.confidence).toBeLessThanOrEqual(1);
  });

  it("an explicit correction is a strong signal that can flip primary", () => {
    let b = initBelief(persona);
    for (let i = 0; i < 5; i++) b = refineMeaning(b, { kind: "correct", meaning: "security", weight: 1 });
    expect(beliefToMeaning(b).primary).toBe("security");
  });

  it("implicit engagement nudges but does not instantly flip", () => {
    const b0 = initBelief(persona);
    const b1 = refineMeaning(b0, { kind: "engage", meaning: "security", weight: 1 });
    expect(b1.scores.security).toBeGreaterThan(b0.scores.security);
    expect(beliefToMeaning(b1).primary).toBe("freedom"); // one nudge doesn't flip
  });

  it("confidence rises as signals accumulate", () => {
    let b = initBelief(persona);
    const c0 = b.confidence;
    for (let i = 0; i < 8; i++) b = refineMeaning(b, { kind: "engage", meaning: "freedom", weight: 1 });
    expect(b.confidence).toBeGreaterThan(c0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/behavior.test.ts`
Expected: FAIL (cannot find `initBelief`).

- [ ] **Step 3: Write the implementation** `web/src/lib/money/behavior.ts`:
```ts
import { MEANING_KEYS, type MeaningKey, type Meaning, type MoneyPersona } from "./types";

export interface BehaviorSignal {
  kind: "correct" | "engage" | "phrase"; // explicit / implicit-click / chat-language
  meaning?: MeaningKey;
  weight: number; // caller-supplied magnitude (e.g. dwell-derived)
}

export interface MeaningBelief {
  scores: Record<MeaningKey, number>;
  signals: number;     // count of signals folded in (drives confidence)
  confidence: number;  // 0..1
}

const KIND_WEIGHT: Record<BehaviorSignal["kind"], number> = { correct: 3, engage: 0.6, phrase: 1 };

export function initBelief(persona: MoneyPersona): MeaningBelief {
  // seed from chart scores so day-1 belief == chart persona
  const scores = { ...persona.scores };
  return { scores, signals: 0, confidence: confidenceFrom(scores, 0) };
}

function confidenceFrom(scores: Record<MeaningKey, number>, signals: number): number {
  const vals = MEANING_KEYS.map((k) => scores[k]);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const top = Math.max(...vals);
  const sep = top / total; // how dominant the leader is
  // more signals + clearer leader → higher confidence, capped at 1
  return Math.min(1, sep * 0.6 + Math.min(signals, 10) / 10 * 0.4);
}

export function refineMeaning(prev: MeaningBelief, sig: BehaviorSignal): MeaningBelief {
  const scores = { ...prev.scores };
  if (sig.meaning) scores[sig.meaning] += KIND_WEIGHT[sig.kind] * sig.weight;
  const signals = prev.signals + 1;
  return { scores, signals, confidence: confidenceFrom(scores, signals) };
}

export function beliefToMeaning(b: MeaningBelief): Meaning {
  const ordered = [...MEANING_KEYS].sort((a, z) => (b.scores[z] - b.scores[a]) || (MEANING_KEYS.indexOf(a) - MEANING_KEYS.indexOf(z)));
  const [primary, secondary] = ordered;
  const OPPOSED: [MeaningKey, MeaningKey][] = [["freedom", "security"], ["status", "care"], ["control", "worth"]];
  const relation = OPPOSED.some(([x, y]) => (x === primary && y === secondary) || (y === primary && x === secondary)) ? "tension" : "reinforce";
  return { primary, secondary, relation };
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/behavior.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/behavior.ts src/lib/money/behavior.test.ts
git commit -m "feat(money): behavior.ts — refine meaning belief from explicit+implicit signals"
```

---

## Phase 5 — `/api/narrative` route (AI prose + day cache + fallback)

### Task 5: KV day-cache helpers + chapter log

**Files:**
- Modify: `web/src/lib/server/store.ts` (append helpers, after the geocode cache block ~line 119)
- Test: `web/src/lib/server/store.money.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/server/store.money.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { narrativeDayGet, narrativeDaySet, pushChapterLog, getChapterLog } from "./store";

describe("money KV helpers (memory fallback)", () => {
  it("day cache round-trips", async () => {
    await narrativeDaySet("u1", "2026-06-14", "p", { hopeNote: "hi" });
    expect(await narrativeDayGet("u1", "2026-06-14", "p")).toEqual({ hopeNote: "hi" });
    expect(await narrativeDayGet("u1", "2026-06-15", "p")).toBeNull();
  });
  it("chapter log keeps most-recent-first, bounded read", async () => {
    await pushChapterLog("u2", { themeKey: "a" });
    await pushChapterLog("u2", { themeKey: "b" });
    const log = await getChapterLog("u2", 14);
    expect((log[0] as { themeKey: string }).themeKey).toBe("b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/server/store.money.test.ts`
Expected: FAIL (cannot find `narrativeDayGet`).

- [ ] **Step 3: Append the implementation** to `web/src/lib/server/store.ts` (after the geocode cache functions, before "internal-test telemetry"):
```ts
// ---- money narrative: per-user-per-day cache + serialized chapter log ----
export async function narrativeDayGet(userId: string, date: string, variant: string): Promise<Json | null> {
  return (await kv()).get(`nrd:${userId}:${date}:${variant}`);
}
export async function narrativeDaySet(userId: string, date: string, variant: string, value: Json): Promise<void> {
  await (await kv()).set(`nrd:${userId}:${date}:${variant}`, value);
}
export async function pushChapterLog(userId: string, chapter: Json): Promise<void> {
  await (await kv()).lpush(`nrlog:${userId}`, chapter);
}
export async function getChapterLog(userId: string, limit = 14): Promise<Json[]> {
  return (await kv()).lrange(`nrlog:${userId}`, 0, limit - 1);
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/server/store.money.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/server/store.ts src/lib/server/store.money.test.ts
git commit -m "feat(money): KV day-cache + serialized chapter log helpers"
```

### Task 6: Add a narrative rate-limit rule

**Files:**
- Modify: `web/src/lib/server/ratelimit.ts` (the `RULES` object)

- [ ] **Step 1: Add the rule.** In `web/src/lib/server/ratelimit.ts`, inside `export const RULES = {`, add after the `chat:` entry:
```ts
  narrative: (): Rule[] => [{ scope: "narr", limit: num(process.env.RL_NARR_DAY, 6), windowMs: DAY }],
```

- [ ] **Step 2: Typecheck.** Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit.**
```bash
git add src/lib/server/ratelimit.ts
git commit -m "feat(money): add narrative daily rate-limit rule"
```

### Task 7: `/api/narrative` route — AI prose around skeleton, day-cache, fallback, H3 A/B

**Files:**
- Read first: `web/node_modules/next/dist/docs/` route-handler guide (per AGENTS.md); `web/src/app/api/reading/route.ts` (pattern to mirror)
- Create: `web/src/app/api/narrative/route.ts`
- Test: `web/src/app/api/narrative/route.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/app/api/narrative/route.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { POST } from "./route";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

beforeAll(() => { process.env.RL_DISABLED = "1"; }); // no rate-limit noise in tests

function req(body: unknown) {
  return new Request("http://localhost/api/narrative", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("/api/narrative", () => {
  it("400 on missing chart", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns a chapter with guardrail-clean prose (AI off → deterministic skeleton)", async () => {
    // With no ANTHROPIC_API_KEY in the test env the route must still return the
    // deterministic skeleton (fallback path), never a 500.
    const res = await POST(req({ chart, userId: "t1", date: "2026-06-13" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.hopeNote).toBe("string");
    expect(json.prophecy && typeof json.prophecy.text).toBe("string");
    expect(json.meaning).toBeTruthy();
    expect(json.page).toBeGreaterThanOrEqual(1); // 连载页码
  });

  it("second call same day is served from cache (page number stable)", async () => {
    const a = await (await POST(req({ chart, userId: "t2", date: "2026-06-13" }))).json();
    const b = await (await POST(req({ chart, userId: "t2", date: "2026-06-13" }))).json();
    expect(b.page).toBe(a.page);
  });

  it("accepts a barnum variant for the H3 A/B test", async () => {
    const res = await POST(req({ chart, userId: "t3", date: "2026-06-13", variant: "barnum" }));
    const json = await res.json();
    expect(json.variant).toBe("barnum");
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/app/api/narrative/route.test.ts`
Expected: FAIL (cannot find `./route`).

- [ ] **Step 3: Write the implementation** `web/src/app/api/narrative/route.ts`:
```ts
import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { moneyPersona } from "@/lib/money/persona";
import { nextChapter } from "@/lib/money/narrative";
import { validateMoneyCopy } from "@/lib/money/guardrail";
import { MEANING_ZH } from "@/lib/money/types";
import type { Chapter, Precision } from "@/lib/money/types";
import { PERSONA, SAFETY, facts } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { isSafe } from "@/lib/ai/safety";
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
    return `以 Molly 的口吻，写今天的一句财运提醒（泛泛的、不针对具体人）。只输出 JSON：{"hopeNote":"≤55字","prophecy":"≤30字"}`;
  }
  return `这是她的真实星盘事实：\n${facts(chart)}\n
她的金钱人格：钱对她意味着「${facet.label}」（${facet.register}）。今天的基调：${ch.tone}（旺/平/慎），叙事角度：${ch.angle}，故事拍子：${ch.arc.beat}。
近 7 天我已经说过：${recent}
要求：写「金钱故事」连载的今天这一页，承前一句、贴她的「${facet.label}」、希望为主调。绝不出现具体金额+日期。不要重复近 7 天的主题/比喻。只输出 JSON，不要代码块：
{"hopeNote":"承前+今天，≤55字","prophecy":"一句不报数字的预言，≤30字"}`;
}

function parse(text: string): { hopeNote: string; prophecy: string } {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  const j = JSON.parse(s >= 0 ? cleaned.slice(s, e + 1) : cleaned);
  return { hopeNote: String(j.hopeNote ?? ""), prophecy: String(j.prophecy ?? "") };
}

export async function POST(req: Request) {
  let body: { chart?: Chart; userId?: string; date?: string; variant?: Variant; precision?: Precision };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }
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
  const baseline = {
    page, variant, meaning: persona.meaning, tone: skeleton.tone, weight: skeleton.weight,
    arc: skeleton.arc, hopeNote: skeleton.hopeNote, prophecy: skeleton.prophecy,
    isDayOne: page === 1, source: "deterministic" as const,
  };

  // rate-limit only the AI path; over limit → baseline (no cost), still cached.
  const id = await resolveIdentity(req);
  const rl = await rateLimit(id, RULES.narrative());
  let result = baseline;
  if (rl.ok) {
    const ac = new AbortController();
    req.signal.addEventListener("abort", () => ac.abort());
    try {
      const r = await runLLM(buildPrompt(chart, skeleton, last, variant), SYSTEM, ac, 400);
      if (r.usage) await logUsage({ route: "narrative", ...r.usage }).catch(() => {});
      const ai = parse(r.text);
      const clean = validateMoneyCopy(ai.hopeNote).ok && validateMoneyCopy(ai.prophecy).ok;
      const safe = isSafe(ai.hopeNote) && isSafe(ai.prophecy);
      if (clean && safe && ai.hopeNote) {
        result = { ...baseline, hopeNote: ai.hopeNote, prophecy: { ...skeleton.prophecy, text: ai.prophecy || skeleton.prophecy.text }, source: "deterministic" as const };
        (result as { source: string }).source = "ai";
      }
    } catch { /* keep baseline */ }
  }

  await pushChapterLog(userId, skeleton).catch(() => {});
  await narrativeDaySet(userId, date, variant, result).catch(() => {});
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Verify the `isSafe` import is correct.** Run:
```bash
grep -n "export" src/lib/ai/safety.ts
```
If the export is named differently (e.g. `crisisScan`, `checkSafety`), update the import and the two `isSafe(...)` calls in `route.ts` to match. If it returns an object like `{ safe: boolean }`, adapt to `.safe`. Then continue.

- [ ] **Step 5: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/app/api/narrative/route.test.ts`
Expected: PASS (4 tests). The AI path is skipped in tests (no key) → baseline returned, which is what the tests assert.

- [ ] **Step 6: Commit.**
```bash
git add src/app/api/narrative/route.ts src/app/api/narrative/route.test.ts
git commit -m "feat(money): /api/narrative — AI prose around deterministic skeleton, day-cache, guardrail+safety fallback, H3 variant"
```

---

## Phase 6 — Instrumentation for H1 / H2 / H3

### Task 8: Client narrative-telemetry helper

**Files:**
- Read first: `web/src/lib/track.ts`
- Create: `web/src/lib/money/track.ts`
- Test: `web/src/lib/money/track.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/track.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import * as base from "@/lib/track";
import { trackNarrativeView, trackDwell, trackMeaningCorrected, trackAccuracy } from "./track";

describe("money telemetry", () => {
  it("forwards typed events to base track()", () => {
    const spy = vi.spyOn(base, "track").mockImplementation(() => {});
    trackNarrativeView({ page: 3, variant: "personalized", weight: "heavy" });
    trackDwell({ page: 3, ms: 4200 });
    trackMeaningCorrected({ from: "freedom", to: "security" });
    trackAccuracy({ rating: "good", variant: "personalized" });
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls[0][0]).toBe("money_narrative_view");
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/track.test.ts`
Expected: FAIL (cannot find `trackNarrativeView`).

- [ ] **Step 3: Write the implementation** `web/src/lib/money/track.ts`:
```ts
import { track } from "@/lib/track";
import type { MeaningKey } from "./types";

// H1 (cadence): view + dwell over time → repetition/dwell-decay curves.
export function trackNarrativeView(p: { page: number; variant: string; weight: string }) {
  track("money_narrative_view", p);
}
export function trackDwell(p: { page: number; ms: number }) {
  track("money_narrative_dwell", p);
}
// H2 (learning data): how often meaning is corrected / engaged.
export function trackMeaningCorrected(p: { from: MeaningKey; to: MeaningKey }) {
  track("money_meaning_corrected", p);
}
export function trackEngage(p: { meaning: MeaningKey; surface: string }) {
  track("money_meaning_engage", p);
}
// H3 (真准 vs 巴纳姆): accuracy rating tagged with the A/B variant.
export function trackAccuracy(p: { rating: "good" | "meh" | "off"; variant: string }) {
  track("money_accuracy_rating", p);
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/track.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/track.ts src/lib/money/track.test.ts
git commit -m "feat(money): typed telemetry for H1/H2/H3 (view/dwell/correction/accuracy)"
```

### Task 9: Deterministic A/B variant assignment (H3)

**Files:**
- Create: `web/src/lib/money/variant.ts`
- Test: `web/src/lib/money/variant.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/lib/money/variant.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { assignVariant } from "./variant";

describe("H3 variant assignment", () => {
  it("is stable per user id", () => {
    expect(assignVariant("abc")).toBe(assignVariant("abc"));
  });
  it("returns one of the two arms", () => {
    expect(["personalized", "barnum"]).toContain(assignVariant("xyz"));
  });
  it("splits roughly in half across many ids", () => {
    let p = 0;
    for (let i = 0; i < 1000; i++) if (assignVariant("user" + i) === "personalized") p++;
    expect(p).toBeGreaterThan(350);
    expect(p).toBeLessThan(650);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/lib/money/variant.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation** `web/src/lib/money/variant.ts`:
```ts
export type Variant = "personalized" | "barnum";

// Stable hash → arm. 80/20 toward personalized: barnum is only the control sample
// needed to measure the H3 delta, not a real product experience for most users.
export function assignVariant(userId: string): Variant {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 5 === 0 ? "barnum" : "personalized";
}
```

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/lib/money/variant.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/money/variant.ts src/lib/money/variant.test.ts
git commit -m "feat(money): deterministic 80/20 A/B variant for H3 (personalized vs barnum)"
```

---

## Phase 7 — UI (lift styling/copy from design/19-money-mirror.html)

> For every page/component below: read the matching panel in `design/19-money-mirror.html` and lift the CSS classes, gradients, fonts, and copy verbatim into Tailwind/JSX. The mockup is the visual source of truth. Follow existing page patterns in `web/src/app/*/page.tsx` and use `useChartGuard()` from `@/lib/guard` for chart-gated pages. **Read the relevant `web/node_modules/next/dist/docs/` page/metadata guide first (AGENTS.md).**

### Task 10: Money reveal page `/money` — S1 钩尖揭示 + S1b 修正

**Files:**
- Read first: `web/src/app/chart/page.tsx` (a chart-gated page example), `design/19-money-mirror.html` panels S1 + S1b
- Create: `web/src/app/money/page.tsx`
- Create: `web/src/components/money/Reveal.tsx`
- Test: `web/src/components/money/Reveal.test.tsx`

- [ ] **Step 1: Write the failing component test** `web/src/components/money/Reveal.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "./Reveal";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona } from "@/lib/money/persona";

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8, lng: 144.9, tz: 10 } as BirthInput);

describe("Reveal", () => {
  it("shows the confident meaning assertion (not '说中了吗')", () => {
    render(<Reveal persona={moneyPersona(chart)} onContinue={() => {}} onCorrect={() => {}} />);
    expect(screen.getByText(/钱对你/)).toBeTruthy();
    expect(screen.queryByText(/说中了吗/)).toBeNull(); // v4: 看得更多, not 可能看错
  });
});
```
> If `@testing-library/react` isn't installed, run `bun add -d @testing-library/react @testing-library/dom` first, then confirm `vitest.config` uses `environment: "jsdom"` (check `web/vitest.config.ts`; existing component tests, if any, confirm the setup — otherwise add `// @vitest-environment jsdom` as the file's first line).

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/components/money/Reveal.test.tsx`
Expected: FAIL (cannot find `./Reveal`).

- [ ] **Step 3: Write `Reveal.tsx`.** Build from the S1 + S1b panels in `design/19-money-mirror.html`. Structure (lift classes/gradients/copy):
```tsx
"use client";
import { useState } from "react";
import { MEANING_ZH, type MeaningKey, type MoneyPersona } from "@/lib/money/types";

export function Reveal({ persona, onContinue, onCorrect }: {
  persona: MoneyPersona;
  onContinue: () => void;
  onCorrect: (m: MeaningKey) => void;
}) {
  const [step, setStep] = useState<"reveal" | "correct">("reveal");
  const primary = MEANING_ZH[persona.meaning.primary];
  const secondary = MEANING_ZH[persona.meaning.secondary];
  // reveal step → mirror S1: tag「钱，对你到底意味着什么」, serif「我知道，钱对你从来不只是钱」,
  //   big meaning = primary.label, styleTag sub, strengths chips, blindSpot gold card, destiny line,
  //   CTA「看我的金钱故事」→ setStep("correct").
  // correct step (S1b, v4 framing) → confident assertion「钱对你是「{primary.label}」——这点，我很确定」,
  //   then「但我还看到你藏起来的另一面」, tension line referencing secondary.label,
  //   picks chips (primary+secondary preselected) calling onCorrect(picked), CTA「就这股，继续」→ onContinue().
  // ... implement both steps with the mockup's classes/copy ...
  return (/* JSX per mockup */ null as any);
}
```
> Implement the full JSX from the two mockup panels — the test only asserts the assertion text + absence of "说中了吗", but build the complete screen.

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/components/money/Reveal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the page** `web/src/app/money/page.tsx`: chart-gated (`useChartGuard()`), compute `moneyPersona(chart)`, render `<Reveal>`; `onCorrect` → POST nothing yet but call `trackMeaningCorrected` + persist the chosen meaning into the zustand store (add a `moneyMeaning` field — mirror how `store.ts` persists `chart`); `onContinue` → navigate to `/money/today`. Fire `track("money_reveal_view")` on mount.

- [ ] **Step 6: Manual render check.** Run `bun run dev`, open `http://localhost:3001/money` after completing onboarding (or seed a chart). Confirm it matches the S1/S1b panels. Then `bun run typecheck`.
Expected: typecheck PASS; screen matches mockup.

- [ ] **Step 7: Commit.**
```bash
git add src/app/money/page.tsx src/components/money/Reveal.tsx src/components/money/Reveal.test.tsx src/lib/store.ts
git commit -m "feat(money): /money reveal page — S1 钩尖揭示 + S1b 修正(看得更多)"
```

### Task 11: Daily narrative page `/money/today` — Day-1 opening + Day-N story card

**Files:**
- Read first: `design/19-money-mirror.html` panels S2 (story card) + Day-1
- Create: `web/src/app/money/today/page.tsx`
- Create: `web/src/components/money/StoryCard.tsx`
- Test: `web/src/components/money/StoryCard.test.tsx`

- [ ] **Step 1: Write the failing test** `web/src/components/money/StoryCard.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoryCard } from "./StoryCard";

const base = { page: 1, isDayOne: true, weight: "heavy", hopeNote: "从今天开始，我每天跟你讲一页。", prophecy: { type: "destiny", text: "靠一次敢转向" } };

describe("StoryCard", () => {
  it("Day-1 shows the opening label '从今天开始' and no 承前", () => {
    render(<StoryCard {...(base as any)} prev={null} />);
    expect(screen.getByText(/从今天开始/)).toBeTruthy();
  });
  it("Day-N shows page number and 承前", () => {
    render(<StoryCard {...(base as any)} page={18} isDayOne={false} prev="昨天你扛住了" />);
    expect(screen.getByText(/第 18 页/)).toBeTruthy();
    expect(screen.getByText(/昨天你扛住了/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/components/money/StoryCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `StoryCard.tsx`** from the S2 `.story` block + Day-1 panel: header `你的金钱故事` + `第 N 页 · 今天` (or `第 1 页 · 从今天开始` when `isDayOne`), a `.prev` 承前 line when `prev` truthy, the serif `hopeNote`, and the prophecy line. Lift `.story/.slbl/.prev/.t` classes.

- [ ] **Step 4: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/components/money/StoryCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the page** `web/src/app/money/today/page.tsx`: chart-gated; on mount `assignVariant(userId)` then POST `chart`+`userId`+today+`variant` to `/api/narrative`; render `<StoryCard>` with the response (`prev` = previous day's `hopeNote` if available from store/log); show MollyThinking while loading (reuse `@/components/MollyThinking`); fire `trackNarrativeView({page,variant,weight})` on data, `trackDwell` on unmount with elapsed ms; render an accuracy 3-button row (`好准 / 一般 / 不太像`) calling `trackAccuracy`. Add the Day-1 "开启提醒" row (push opt-in) — wired in Phase 8.

- [ ] **Step 6: Manual check + typecheck.** `bun run dev`, open `/money/today`; verify Day-1 vs later. `bun run typecheck`.

- [ ] **Step 7: Commit.**
```bash
git add src/app/money/today/page.tsx src/components/money/StoryCard.tsx src/components/money/StoryCard.test.tsx
git commit -m "feat(money): /money/today — Day-1 opening + Day-N story card + H1/H3 telemetry"
```

### Task 12: S0 entry cards on `/today` and `/chart`

**Files:**
- Read first: `design/19-money-mirror.html` S0 `.entry`; `web/src/app/today/page.tsx`, `web/src/app/chart/page.tsx`
- Create: `web/src/components/money/EntryCard.tsx`
- Modify: `web/src/app/today/page.tsx`, `web/src/app/chart/page.tsx`

- [ ] **Step 1: Create `EntryCard.tsx`** from S0 `.entry` block: eye dot, serif「钱，对你到底意味着什么？」, the `.ed` subcopy, gold「让 Molly 看穿 →」; a `Link` to `/money`. On render fire `track("money_entry_impression", { surface })` (prop `surface: "today" | "chart"`).

- [ ] **Step 2: Insert `<EntryCard surface="today" />`** into `today/page.tsx` (below the daily lines) and `<EntryCard surface="chart" />` into `chart/page.tsx` (near the 财富 theme entry). Match surrounding layout.

- [ ] **Step 3: Typecheck + manual check.** `bun run typecheck`; `bun run dev` → confirm both cards appear and link to `/money`.

- [ ] **Step 4: Commit.**
```bash
git add src/components/money/EntryCard.tsx src/app/today/page.tsx src/app/chart/page.tsx
git commit -m "feat(money): S0 entry cards on /today and /chart → /money"
```

### Task 13: E2E — full Slice 0 funnel

**Files:**
- Read first: existing E2E under `web/e2e/` or `web/tests/` (find with `find web -name '*.spec.ts' -path '*e2e*' -o -name '*.e2e.ts'`)
- Create: `web/e2e/money-mirror.spec.ts` (match the existing E2E directory/naming)

- [ ] **Step 1: Write the E2E** mirroring the existing Playwright setup (reuse their helper for completing onboarding/seeding a chart). Assert the funnel: entry card on `/today` → `/money` reveal shows meaning assertion → correction picks → continue → `/money/today` shows a story card + accuracy buttons. Add the guardrail assertion: the rendered prophecy text contains no `\d+ *(万|元|块)` + future-date combo.

- [ ] **Step 2: Run E2E.** Run: `./node_modules/.bin/playwright test e2e/money-mirror.spec.ts`
Expected: PASS. (Run `bun run dev` in another terminal if the config doesn't auto-start the server — check the existing Playwright config.)

- [ ] **Step 3: Commit.**
```bash
git add e2e/money-mirror.spec.ts
git commit -m "test(money): E2E funnel — entry → reveal → correct → daily story"
```

---

## Phase 8 — Push (re-engagement loop)

> Molly already has a PWA service worker (`web/public/sw.js`) and an `InstallPrompt`. Read both before starting. Slice 0 push = opt-in + store subscription + a send endpoint (triggerable by Vercel Cron). Keep it minimal; do NOT build a scheduler UI.

### Task 14: Web Push subscription storage

**Files:**
- Read first: `web/public/sw.js`, `web/src/components/InstallPrompt.tsx`
- Modify: `web/src/lib/server/store.ts` (add push-subscription helpers)
- Create: `web/src/app/api/push/subscribe/route.ts`
- Test: `web/src/app/api/push/subscribe/route.test.ts`

- [ ] **Step 1: Write the failing test** `web/src/app/api/push/subscribe/route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { getPushSubs } from "@/lib/server/store";

function req(body: unknown) {
  return new Request("http://localhost/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
describe("/api/push/subscribe", () => {
  it("stores a subscription for a user", async () => {
    const sub = { endpoint: "https://x/y", keys: { p256dh: "a", auth: "b" } };
    const res = await POST(req({ userId: "pu1", sub }));
    expect(res.status).toBe(200);
    const all = await getPushSubs("pu1");
    expect(all.length).toBe(1);
  });
  it("400 on missing endpoint", async () => {
    const res = await POST(req({ userId: "pu1", sub: {} }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `./node_modules/.bin/vitest run src/app/api/push/subscribe/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add KV helpers** to `web/src/lib/server/store.ts`:
```ts
// ---- web push subscriptions ----
export async function addPushSub(userId: string, sub: Json): Promise<void> {
  await (await kv()).lpush(`push:${userId}`, sub);
  await (await kv()).sadd("push:users", userId);
}
export async function getPushSubs(userId: string): Promise<Json[]> {
  return (await kv()).lrange(`push:${userId}`, 0, 49);
}
export async function listPushUsers(): Promise<string[]> {
  return (await kv()).smembers("push:users");
}
```

- [ ] **Step 4: Write the route** `web/src/app/api/push/subscribe/route.ts`:
```ts
import { NextResponse } from "next/server";
import { addPushSub } from "@/lib/server/store";
export const runtime = "nodejs";
export async function POST(req: Request) {
  let body: { userId?: string; sub?: { endpoint?: string; keys?: unknown } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }
  if (!body.sub?.endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
  await addPushSub(body.userId || "anon", body.sub);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run test to verify it passes.** Run: `./node_modules/.bin/vitest run src/app/api/push/subscribe/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit.**
```bash
git add src/lib/server/store.ts src/app/api/push/subscribe/route.ts src/app/api/push/subscribe/route.test.ts
git commit -m "feat(push): store web-push subscriptions per user"
```

### Task 15: Push send endpoint (cron-triggerable) + client opt-in

**Files:**
- Modify: `web/public/sw.js` (add `push` + `notificationclick` handlers if absent)
- Create: `web/src/app/api/push/send/route.ts`
- Create: `web/src/lib/push-client.ts` (browser: register, ask permission, POST subscription)
- Modify: Day-1 "开启提醒" row in `web/src/app/money/today/page.tsx` to call the opt-in

- [ ] **Step 1: Install web-push.** Run: `bun add web-push` and `bun add -d @types/web-push`.

- [ ] **Step 2: Write the send route** `web/src/app/api/push/send/route.ts`:
```ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { listPushUsers, getPushSubs } from "@/lib/server/store";
export const runtime = "nodejs";
export const maxDuration = 60;

// Cron-triggered (Vercel Cron) OR manual with ?secret=ADMIN_SECRET. Sends a
// teaser nudge — NOT the narrative itself (that's generated on open, for cost).
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "no VAPID keys" }, { status: 500 });
  webpush.setVapidDetails("mailto:hi@molly.app", pub, priv);

  const payload = JSON.stringify({ title: "你的金钱故事更新了", body: "今天这一页，我放在这儿等你。", url: "/money/today" });
  let sent = 0;
  for (const uid of await listPushUsers()) {
    for (const sub of await getPushSubs(uid)) {
      try { await webpush.sendNotification(sub as webpush.PushSubscription, payload); sent++; } catch { /* dead sub */ }
    }
  }
  return NextResponse.json({ sent });
}
```

- [ ] **Step 3: Add SW handlers** to `web/public/sw.js` (if not already present):
```js
self.addEventListener("push", (e) => {
  const d = (() => { try { return e.data.json(); } catch { return { title: "Molly", body: "", url: "/" }; } })();
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, data: { url: d.url } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});
```

- [ ] **Step 4: Write `push-client.ts`** with `enableMoneyPush(userId)`: ask `Notification.requestPermission()`, get the SW registration, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID_PUBLIC from NEXT_PUBLIC_VAPID_PUBLIC_KEY> })`, POST `{userId, sub}` to `/api/push/subscribe`, `track("money_push_optin")`. Wire the Day-1 "开启提醒" row to call it.

- [ ] **Step 5: Generate VAPID keys (one-time, document only).** Run: `./node_modules/.bin/web-push generate-vapid-keys`. Add to plan notes: set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel + `.env.production`. Add a Vercel Cron entry (in `vercel.json`) hitting `/api/push/send?secret=$ADMIN_SECRET` daily at the morning slot. Do NOT commit secrets.

- [ ] **Step 6: Typecheck + smoke.** `bun run typecheck`. Manually call `GET /api/push/send` without secret → expect 403.

- [ ] **Step 7: Commit.**
```bash
git add src/app/api/push/send/route.ts src/lib/push-client.ts public/sw.js src/app/money/today/page.tsx vercel.json package.json
git commit -m "feat(push): daily nudge send endpoint + client opt-in + SW handlers (re-engagement loop)"
```

---

## Phase 9 — Integration verification

### Task 16: Full suite green + build

- [ ] **Step 1: Typecheck.** Run: `bun run typecheck` → Expected: clean.
- [ ] **Step 2: Unit tests.** Run: `./node_modules/.bin/vitest run` → Expected: all pass (existing 26 + new money/push tests).
- [ ] **Step 3: E2E.** Run: `./node_modules/.bin/playwright test` → Expected: existing 3 + money funnel pass.
- [ ] **Step 4: Build.** Run: `bun run build` → Expected: succeeds, lists `/money`, `/money/today`, `/api/narrative`, `/api/push/subscribe`, `/api/push/send` routes.
- [ ] **Step 5: Commit any fixes; then verify admin export shows the new events.** Manually: open `/money/today` locally (with `NEXT_PUBLIC_MOLLY_TEST=1`), then GET `/api/admin/export?secret=$ADMIN_SECRET` and confirm `money_narrative_view` / `money_accuracy_rating` events are captured (this is the H1/H3 data path working end-to-end).

```bash
git add -A && git commit -m "chore(money): Slice 0 integration green (typecheck/vitest/e2e/build)"
```

### Task 17: Hypothesis-readout doc (how Slice 0 answers H1/H2/H3)

**Files:**
- Create: `web/src/lib/money/README.md`

- [ ] **Step 1: Write `README.md`** documenting, for the operator: which events feed which hypothesis and the pass thresholds from spec §10 —
  - **H1 (节奏)**: `money_narrative_view` + `money_narrative_dwell` over 6–8 weeks → dwell-decay + view-frequency curves; the LLM repetition-score job (run `agent-test-runner`-style over a fixed chart's N-day output) as the leading indicator.
  - **H2 (学习数据)**: `money_meaning_corrected` + `money_meaning_engage` rates → does belief reach `confidence` threshold without relying on the optional witness prompt?
  - **H3 (真准 vs 巴纳姆)**: `money_accuracy_rating` split by `variant` → personalized-vs-barnum "好准" delta; significant positive delta required or the differentiation thesis is falsified.
  - Pass thresholds: D7 return ≥ (current Molly baseline + Δ, set before launch); cross-segment "好准" ≥ threshold for BOTH a 陈昊-type and a 秦姐-type canary.

- [ ] **Step 2: Commit.**
```bash
git add src/lib/money/README.md
git commit -m "docs(money): Slice 0 hypothesis readout (H1/H2/H3 → events + thresholds)"
```

---

## Self-Review checklist (run after implementing)

- **Spec coverage:** persona/meaning-tension/precision (Task 1) ✓; narrative arc+cadence+themeKey+no-number prophecy (Task 3) ✓; guardrail red lines (Task 2) ✓; behavior learning (Task 4) ✓; safety reuse (Task 7 Step 4) ✓; /api/narrative + day-cache + cost + fallback (Tasks 5–7) ✓; push retention loop (Tasks 14–15) ✓; S0/S1/S1b/Day-1/daily UI (Tasks 10–13) ✓; H1/H2/H3 instrumentation (Tasks 8–9, 17) ✓; OUT of scope confirmed absent: paywall/blueprint/full-month-calendar/share-card/seam.
- **Type consistency:** `MeaningKey`/`Meaning`/`MoneyPersona`/`Chapter`/`Prophecy` all from `types.ts`; `moneyPersona`, `nextChapter`, `validateMoneyCopy`, `refineMeaning`, `assignVariant` names match across tasks; `isSafe` reconciled to the real export name in Task 7 Step 4.
- **Known follow-ups (NOT Slice 0):** witness-loop UI (S4), wealth calendar grid (S2 full), paid blueprint, seam→B, i18n. Tracked in spec §9.
