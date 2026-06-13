import { bodyLongitude, type Chart } from "./chart";

export type WealthLevel = "wang" | "ping" | "shen"; // 旺 / 平 / 慎

export interface DayWealth {
  day: number;
  level: WealthLevel;
  intensity: number; // 0..100 (旺度: 高=越绿, 低=越红)
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

// Daily 财运 score from real transiting Moon aspects to natal benefic (Jupiter/Venus) vs malefic (Saturn).
// TODO(key): richer model (2nd/8th rulers, transiting Jupiter/Venus); copy generation via Claude.
export function wealthScore(chart: Chart, date: Date): number {
  const moon = bodyLongitude("Moon", date);
  const jup = chart.placements.find((p) => p.body === "Jupiter")!.lon;
  const ven = chart.placements.find((p) => p.body === "Venus")!.lon;
  const sat = chart.placements.find((p) => p.body === "Saturn")!.lon;

  const benefic =
    harmonic(sep(moon, jup), [0, 60, 120]) * 26 +
    harmonic(sep(moon, ven), [0, 60, 120]) * 18;
  const malefic =
    harmonic(sep(moon, sat), [0, 90, 180]) * 24 +
    harmonic(sep(moon, jup), [90, 180]) * 10;

  return Math.max(0, Math.min(100, Math.round(50 + benefic - malefic)));
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
