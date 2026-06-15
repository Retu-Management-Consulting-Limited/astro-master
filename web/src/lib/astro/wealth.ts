import { bodyLongitude, isRetrograde, type Chart, type BodyName } from "./chart";

export type WealthLevel = "wang" | "ping" | "shen"; // 旺 / 平 / 慎

// The two financial planets whose retrograde the audience acts on: Mercury
// (contracts/commerce) and Venus (money/value/purchases). Flagged as an
// annotation on the day — it does NOT feed the score (a flag, not a malefic),
// so it can't distort 旺/慎 balance, only warn "缓签约/缓大额".
export const MONEY_RETRO_BODIES: BodyName[] = ["Mercury", "Venus"];

export interface DayWealth {
  day: number;
  level: WealthLevel;
  intensity: number; // 0..100 (旺度: 高=越绿, 低=越红)
  retro: BodyName[]; // money planets retrograde this day (Mercury/Venus), [] if none
  driver?: Driver;   // the day's loudest named factor (for copy), if any
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

// Money planets that move slowly enough to form multi-day windows. Each carries
// (a) the score weighting that drives eventPressure + the daily 主驱动, and
// (b) the tight event orbs that drive the named windows. Mercury is event-only
// (scoreWeight 0) — including it in the score skews 旺 up (spec §8); it stays a
// "水星谈钱" window. Sun scores but has no window (too fast/common for a "big event").
export type Valence = 1 | -1 | 0;
export interface MoneyPlanet {
  body: BodyName;
  valence: Valence;
  name: string;
  scoreAspects: number[]; // [] = not in score
  scoreOrb: number;
  scoreWeight: number;    // 0 = event-only
  eventAspects: { angle: number; orb: number }[]; // [] = no window
}
export const MONEY_PLANETS: MoneyPlanet[] = [
  { body: "Jupiter", valence: 1,  name: "木星扩张财运",         scoreAspects: [0, 60, 120], scoreOrb: 10, scoreWeight: 8, eventAspects: [{ angle: 0, orb: 5 }, { angle: 60, orb: 3 }, { angle: 120, orb: 3 }] },
  { body: "Venus",   valence: 1,  name: "金星照财库",           scoreAspects: [0, 60, 120], scoreOrb: 6,  scoreWeight: 6, eventAspects: [{ angle: 0, orb: 5 }, { angle: 60, orb: 3 }, { angle: 120, orb: 3 }] },
  { body: "Sun",     valence: 1,  name: "太阳暖财",             scoreAspects: [0, 120],     scoreOrb: 5,  scoreWeight: 4, eventAspects: [] },
  { body: "Mars",    valence: -1, name: "火星冲财·易冲动破财",  scoreAspects: [0, 90, 180], scoreOrb: 6,  scoreWeight: 8, eventAspects: [{ angle: 0, orb: 5 }, { angle: 90, orb: 3 }, { angle: 180, orb: 3 }] },
  { body: "Saturn",  valence: -1, name: "土星压财·紧手谨慎",    scoreAspects: [0, 90, 180], scoreOrb: 9,  scoreWeight: 8, eventAspects: [{ angle: 0, orb: 5 }, { angle: 90, orb: 3 }, { angle: 180, orb: 3 }] },
  { body: "Mercury", valence: 0,  name: "水星谈钱·宜签约谈判",  scoreAspects: [],           scoreOrb: 0,  scoreWeight: 0, eventAspects: [{ angle: 0, orb: 4 }] },
];

const EVENT_GAIN = 1.5;
const EVENT_CAP = 36;
const DRIVER_MIN = 1.5; // a 主驱动 must clear this raw term magnitude

export interface DriverTerm { planet: BodyName; name: string; valence: Valence; value: number; }

// Signed per-planet contributions to the daily score (the 5 scoring planets).
export function eventTerms(chart: Chart, date: Date): DriverTerm[] {
  const pts = moneyPoints(chart);
  const out: DriverTerm[] = [];
  for (const p of MONEY_PLANETS) {
    if (p.scoreWeight === 0) continue;
    const t = bodyLongitude(p.body, date);
    let s = 0;
    for (const mp of pts) s += harmonic(sep(t, mp), p.scoreAspects, p.scoreOrb);
    out.push({ planet: p.body, name: p.name, valence: p.valence, value: p.valence * p.scoreWeight * s });
  }
  return out;
}

// Slow/event layer: real Jupiter/Venus/Sun/Mars/Saturn transits to the money
// points, gained and bounded. Replaces the old Jupiter/Venus/Saturn-only slow layer.
export function eventPressure(chart: Chart, date: Date): number {
  const raw = eventTerms(chart, date).reduce((a, t) => a + t.value, 0);
  return Math.max(-EVENT_CAP, Math.min(EVENT_CAP, EVENT_GAIN * raw));
}

export interface Driver { planet: BodyName; name: string; valence: Valence; }

// The single loudest scoring factor for the day (for the day-detail copy).
export function dayDriver(chart: Chart, date: Date): Driver | undefined {
  let best: DriverTerm | undefined;
  for (const t of eventTerms(chart, date)) if (!best || Math.abs(t.value) > Math.abs(best.value)) best = t;
  if (!best || Math.abs(best.value) < DRIVER_MIN) return undefined;
  return { planet: best.planet, name: best.name, valence: best.value > 0 ? 1 : -1 };
}

// Daily 财运 score: a fast layer (transiting Moon vs natal benefic/malefic) plus
// the event layer (real Jup/Ven/Sun/Mars/Sat transits to the natal money points).
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

  return Math.max(0, Math.min(100, Math.round(50 + benefic - malefic + eventPressure(chart, date))));
}

export function wealthLevel(score: number): WealthLevel {
  if (score >= 64) return "wang";
  if (score <= 42) return "shen";
  return "ping";
}

export function dayWealth(chart: Chart, year: number, month: number, day: number): DayWealth {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const score = wealthScore(chart, date);
  const retro = MONEY_RETRO_BODIES.filter((b) => isRetrograde(b, date));
  return { day, level: wealthLevel(score), intensity: score, retro, driver: dayDriver(chart, date) };
}

// Group a sorted ascending day list into [start,end] runs, merging when the gap
// between consecutive days is ≤ maxGap (so a 1-day dip inside a transit window
// doesn't split it).
export function mergeWindows(days: number[], maxGap: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (last && d - last.end <= maxGap) last.end = d;
    else out.push({ start: d, end: d });
  }
  return out;
}

export interface EventWindow {
  planet: BodyName;
  name: string;
  valence: Valence;
  startDay: number;
  endDay: number;
  peakDay: number;
}

// Tightness (0..1) of a planet's closest event aspect to any money point on a date.
function eventStrength(p: MoneyPlanet, pts: number[], date: Date): number {
  const t = bodyLongitude(p.body, date);
  let best = 0;
  for (const mp of pts) for (const a of p.eventAspects) {
    const o = Math.abs(sep(t, mp) - a.angle);
    if (o <= a.orb) best = Math.max(best, 1 - o / a.orb);
  }
  return best;
}

// Named "big money event" windows for the month: per event-planet, the days it
// tightly aspects a money point, merged into runs (gap ≤ 2), peak = tightest day.
export function monthEvents(chart: Chart, year: number, month: number): EventWindow[] {
  const pts = moneyPoints(chart);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: EventWindow[] = [];
  for (const p of MONEY_PLANETS) {
    if (p.eventAspects.length === 0) continue;
    const strength: Record<number, number> = {};
    const hits: number[] = [];
    for (let d = 1; d <= last; d++) {
      const s = eventStrength(p, pts, new Date(Date.UTC(year, month - 1, d, 12, 0)));
      if (s > 0) { hits.push(d); strength[d] = s; }
    }
    for (const w of mergeWindows(hits, 2)) {
      let peakDay = w.start;
      for (let d = w.start; d <= w.end; d++) if ((strength[d] ?? 0) > (strength[peakDay] ?? 0)) peakDay = d;
      out.push({ planet: p.body, name: p.name, valence: p.valence, startDay: w.start, endDay: w.end, peakDay });
    }
  }
  return out.sort((a, b) => a.startDay - b.startDay);
}

export interface MonthWealth {
  days: DayWealth[];
  goldenDays: number[]; // top 旺 days
  events: EventWindow[]; // named money-event windows for the month (Layer 2)
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
  const events = monthEvents(chart, year, month);
  return { days, goldenDays, events };
}
