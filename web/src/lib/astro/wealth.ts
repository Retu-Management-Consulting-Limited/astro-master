import { bodyLongitude, type Chart, type BodyName } from "./chart";

export type WealthLevel = "wang" | "ping" | "shen"; // 旺 / 平 / 慎

export interface DayWealth {
  day: number;
  level: WealthLevel;
  intensity: number; // 0..100 (旺度: 高=越绿, 低=越红)
}

// Non-color cue for each day so 旺/慎 are distinguishable without relying on
// red/green alone (color-blind safety / B2). The glyph is a shape (▲/▼), the
// label feeds each cell's aria-label.
export function wealthMark(level: WealthLevel): { glyph: string; label: string } {
  if (level === "wang") return { glyph: "▲", label: "财运旺" };
  if (level === "shen") return { glyph: "▼", label: "财运慎" };
  return { glyph: "·", label: "财运平" };
}

function sep(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
// harmonic proximity: returns weighted hit for a set of angles within orb
function harmonic(angle: number, targets: number[], orb = 8): number {
  let best = 0;
  for (const t of targets) {
    const o = Math.abs(angle - t);
    if (o <= orb) best = Math.max(best, 1 - o / orb);
  }
  return best;
}

// Traditional (visible-planet) ruler of each sign, indexed 0=Aries … 11=Pisces.
const SIGN_RULER: BodyName[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];
export function signRuler(signIndex: number): BodyName {
  return SIGN_RULER[((signIndex % 12) + 12) % 12];
}
// Whole-sign house n (1-based) → its sign index, from the ascendant sign.
export function houseSign(ascSignIndex: number, n: number): number {
  return (ascSignIndex + n - 1) % 12;
}

const natalLon = (chart: Chart, b: BodyName): number | undefined =>
  chart.placements.find((p) => p.body === b)?.lon;

// The natal "money points": Venus & Jupiter (natural significators of value &
// fortune) + the rulers of the 2nd (own money) and 8th (others' money) houses.
function moneyPoints(chart: Chart): number[] {
  const pts: number[] = [];
  for (const b of ["Venus", "Jupiter"] as BodyName[]) {
    const l = natalLon(chart, b);
    if (l != null) pts.push(l);
  }
  for (const n of [2, 8]) {
    const l = natalLon(chart, signRuler(houseSign(chart.ascSignIndex, n)));
    if (l != null) pts.push(l);
  }
  return pts;
}

// Slow layer: transiting benefics (Jupiter, Venus) aspecting the natal money
// points. Jupiter is near-static over a month (a baseline), Venus sweeps (multi-
// day windows) — together this gives 财运 real "golden periods", not just daily
// Moon noise. Bounded so it tilts, never dominates.
export function slowWealth(chart: Chart, date: Date): number {
  const tJup = bodyLongitude("Jupiter", date);
  const tVen = bodyLongitude("Venus", date);
  let s = 0;
  for (const mp of moneyPoints(chart)) {
    s += harmonic(sep(tJup, mp), [0, 60, 120], 10) * 8;
    s += harmonic(sep(tVen, mp), [0, 60, 120], 6) * 5;
  }
  return Math.min(s, 28);
}

// Daily 财运 score: a fast layer (transiting Moon vs natal benefic/malefic) plus
// a slow layer (transiting Jupiter/Venus to the natal money points).
export function wealthScore(chart: Chart, date: Date): number {
  const moon = bodyLongitude("Moon", date);
  const jup = chart.placements.find((p) => p.body === "Jupiter")!.lon;
  const ven = chart.placements.find((p) => p.body === "Venus")!.lon;
  const sat = chart.placements.find((p) => p.body === "Saturn")!.lon;

  const benefic =
    harmonic(sep(moon, jup), [0, 60, 120]) * 22 +
    harmonic(sep(moon, ven), [0, 60, 120]) * 15;
  const malefic =
    harmonic(sep(moon, sat), [0, 90, 180]) * 24 +
    harmonic(sep(moon, jup), [90, 180]) * 10;

  return Math.max(0, Math.min(100, Math.round(50 + benefic - malefic + slowWealth(chart, date))));
}

export function wealthLevel(score: number): WealthLevel {
  if (score >= 64) return "wang";
  if (score <= 42) return "shen";
  return "ping";
}

export function dayWealth(chart: Chart, year: number, month: number, day: number): DayWealth {
  const score = wealthScore(chart, new Date(Date.UTC(year, month - 1, day, 12, 0)));
  return { day, level: wealthLevel(score), intensity: score };
}

export interface MonthWealth {
  days: DayWealth[];
  goldenDays: number[]; // top 旺 days
}

export function monthWealth(chart: Chart, year: number, month: number): MonthWealth {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: DayWealth[] = [];
  for (let d = 1; d <= last; d++) days.push(dayWealth(chart, year, month, d));
  const goldenDays = [...days]
    .filter((d) => d.level === "wang")
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 2)
    .map((d) => d.day)
    .sort((a, b) => a - b);
  return { days, goldenDays };
}
