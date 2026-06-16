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

// Which meaning facet to color today with: alternate primary/secondary by day
// parity so a tension persona hears both sides over time.
function facetFor(persona: MoneyPersona, date: Date): MeaningKey {
  return date.getUTCDate() % 2 === 0 ? persona.meaning.primary : persona.meaning.secondary;
}

function prophecyTypeFor(tone: Tone, beat: Beat): ProphecyType {
  if (beat === "setup") return "destiny";
  if (beat === "integrate") return "texture";
  return tone === "wang" ? "window" : "conditional";
}

// Deterministic transit key: the Moon's sign today (cheap, varies daily).
function transitKeyFor(chart: Chart, date: Date): string {
  const moon = bodyLongitude("Moon", date);
  const idx = Math.floor(moon / 30); // moon sign index 0..11
  void chart; // chart reserved for richer transit keys later
  return `moon${idx}`;
}

// Deterministic prose (the AI route may rewrite richer; this is the safe fallback).
// Colored by meaning register; never contains a number+date (guardrail-clean).
function composeHope(facet: MeaningKey, tone: Tone): string {
  const m = MEANING_ZH[facet];
  if (tone === "wang") return `今天有股顺风——对你这种把钱看作「${m.label}」的人，正是往「${m.register}」再走一步的时候。`;
  if (tone === "shen") return `今天先稳着。你的钱容易跟着情绪走，我替你拦一下——「${m.register}」不急在这一天。`;
  return `平常的一天。把「${m.register}」放在心上，小事上对自己好一点就够了。`;
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

  const themeKey = `${transitKey}|${facet}|${prophecyType}`;
  // anti-repeat: if this themeKey appeared in the last 14 chapters, rotate angle.
  const recent = lastChapters.slice(0, 14);
  const usedAnglesForTheme = new Set(recent.filter((c) => c.themeKey === themeKey).map((c) => c.angle));
  const defaultAngle: Angle = tone === "wang" ? "opportunity" : tone === "shen" ? "caution" : "identity";
  const angle = usedAnglesForTheme.has(defaultAngle)
    ? ANGLES.find((a) => !usedAnglesForTheme.has(a)) ?? defaultAngle
    : defaultAngle;

  return {
    transitKey,
    tone,
    meaningFacet: facet,
    prophecyType,
    angle,
    themeKey,
    weight: weightFor(tone, beat),
    arc: { seasonKey: seasonKeyFor(date), beat },
    hopeNote: composeHope(facet, tone),
    prophecy: composeProphecy(prophecyType, facet),
  };
}
