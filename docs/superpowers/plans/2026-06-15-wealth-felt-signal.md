# Felt Wealth Signal (L1+L2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 财运日历 daily signal decisive (cut 平 from 69%→~52%) and named (per-day 主驱动 + 2–4 named money-event windows/month), driven by real Jupiter/Venus/Sun/Mars/Saturn transits to the natal money points.

**Architecture:** Layer 1 replaces the current `slowWealth` with a 5-planet `eventPressure` (gain 1.5, cap ±36) folded into `wealthScore`. Layer 2 adds `monthEvents` (tight money-point transits aggregated into named windows) and a per-day `dayDriver`. Both are additive to the existing `DayWealth`/`MonthWealth` shapes; level thresholds, retro flag, and golden-days are untouched. UI surfaces the driver in the day-detail and a "本月大事件" list.

**Tech Stack:** Bun + TypeScript, Vitest, Next.js (App Router), Playwright. All astro from `astronomy-engine` via `web/src/lib/astro/chart.ts`.

**Locked calibration (spec §8):** `G = 1.5`, `EVENT_CAP = 36`, Mercury **excluded** from the score (event-only). Event orbs: Venus/Jupiter `[0:5, 60:3, 120:3]`, Mars/Saturn `[0:5, 90:3, 180:3]`, Mercury `[0:4]`.

---

## File Structure

- **Modify** `web/src/lib/astro/wealth.ts` — replace `slowWealth`→`eventPressure`, add `MONEY_PLANETS` table, `eventTerms`, `dayDriver`, `mergeWindows`, `monthEvents`; extend `DayWealth` (+`driver`) and `MonthWealth` (+`events`).
- **Modify** `web/src/lib/astro/wealth.test.ts` — replace slowWealth tests with eventPressure tests; add driver, mergeWindows, monthEvents tests.
- **Modify** `web/src/__guards__/content-freshness.test.ts` — add decisiveness + personalized-events strong assertions.
- **Modify** `web/src/app/wealth/page.tsx` — event markers, driver-aware day-detail copy, "本月大事件" list.
- **Throwaway** `web/shadow.ts` — pre-deploy 192-chart distribution check (NOT committed).

All new exported symbols live in `wealth.ts` (one engine file, one responsibility: scoring + events). No new files.

---

## Task 1: Replace slowWealth with the 5-planet eventPressure

**Files:**
- Modify: `web/src/lib/astro/wealth.ts` (the `slowWealth` block at ~82-95 and `wealthScore` at ~97)
- Test: `web/src/lib/astro/wealth.test.ts`

- [ ] **Step 1: Write failing tests** — replace the two existing `slowWealth` tests (the `it("slowWealth is symmetric-bounded [-28,28] …")` and `it("slow malefic: transiting Saturn …")`) with these:

```ts
it("eventPressure is bounded [-36,36] and fires over a month", () => {
  let nonZero = 0;
  for (let d = 1; d <= 30; d++) {
    const p = eventPressure(chart, new Date(Date.UTC(2026, 5, d, 12, 0)));
    expect(p).toBeGreaterThanOrEqual(-36);
    expect(p).toBeLessThanOrEqual(36);
    if (p !== 0) nonZero++;
  }
  expect(nonZero).toBeGreaterThan(0);
});

it("eventPressure: a benefic (Venus/Jupiter) transit lifts, a malefic (Mars/Saturn) drops", () => {
  // 1990-03-21 Beijing: transiting Saturn afflicts a money point on 2026-03-01 (neg);
  // 1975-02-09 Jilin: transiting Jupiter trines its Pisces money stellium in early June (pos).
  const saturnAfflicted = computeChart({ year: 1990, month: 3, day: 21, hour: 6, minute: 5, lat: 39.9042, lng: 116.4074, tz: 8 });
  const jupiterLifted = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
  expect(eventPressure(saturnAfflicted, new Date(Date.UTC(2026, 2, 1, 12, 0)))).toBeLessThan(0);
  expect(eventPressure(jupiterLifted, new Date(Date.UTC(2026, 5, 3, 12, 0)))).toBeGreaterThan(0);
});
```

Also update the import line at top of the test file to include the new symbols (will fail to resolve until implemented):

```ts
import { wealthScore, wealthLevel, dayWealth, monthWealth, signRuler, houseSign,
         eventPressure, eventTerms, dayDriver, mergeWindows, monthEvents,
         MONEY_PLANETS } from "./wealth";
```

- [ ] **Step 2: Run, verify fail**

Run: `./node_modules/.bin/vitest run src/lib/astro/wealth.test.ts`
Expected: FAIL — `eventPressure`/`eventTerms`/etc. not exported.

- [ ] **Step 3: Implement** — in `web/src/lib/astro/wealth.ts`, DELETE the whole `slowWealth` function (the block starting `// Slow layer: …` through its closing `}`) and INSERT in its place:

```ts
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
```

Then in `wealthScore`, change the final line from `… + slowWealth(chart, date)))` to `… + eventPressure(chart, date)))`.

- [ ] **Step 4: Run, verify pass**

Run: `./node_modules/.bin/vitest run src/lib/astro/wealth.test.ts`
Expected: PASS (the eventPressure tests; the rest of the file still green).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/astro/wealth.ts web/src/lib/astro/wealth.test.ts
git commit -m "feat(wealth): eventPressure — 5-planet transit layer replaces slowWealth (L1)"
```

---

## Task 2: Daily 主驱动 (dayDriver) + DayWealth.driver

**Files:**
- Modify: `web/src/lib/astro/wealth.ts` (`DayWealth` interface ~11; `dayWealth` ~119)
- Test: `web/src/lib/astro/wealth.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it("dayDriver picks the strongest signed term; undefined when nothing is significant", () => {
  const kevin = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
  // 2026-06-08: transiting Jupiter is tight on Kevin's Pisces money stellium → benefic driver.
  const d = dayDriver(kevin, new Date(Date.UTC(2026, 5, 8, 12, 0)));
  expect(d).toBeTruthy();
  expect(d!.valence).toBe(1);
  expect(["Jupiter", "Venus", "Sun"]).toContain(d!.planet);
});

it("dayWealth carries a driver without changing the score", () => {
  const dw = dayWealth(chart, 2026, 6, 8);
  expect(dw.intensity).toBe(wealthScore(chart, new Date(Date.UTC(2026, 5, 8, 12, 0))));
  expect(dw).toHaveProperty("driver");
});
```

- [ ] **Step 2: Run, verify fail**

Run: `./node_modules/.bin/vitest run src/lib/astro/wealth.test.ts`
Expected: FAIL — `dayDriver` not exported; `dw.driver` undefined property type error.

- [ ] **Step 3: Implement** — add after `eventPressure`:

```ts
export interface Driver { planet: BodyName; name: string; valence: Valence; }

// The single loudest scoring factor for the day (for the day-detail copy).
export function dayDriver(chart: Chart, date: Date): Driver | undefined {
  let best: DriverTerm | undefined;
  for (const t of eventTerms(chart, date)) if (!best || Math.abs(t.value) > Math.abs(best.value)) best = t;
  if (!best || Math.abs(best.value) < DRIVER_MIN) return undefined;
  return { planet: best.planet, name: best.name, valence: best.value > 0 ? 1 : -1 };
}
```

Extend the `DayWealth` interface (add field after `retro`):

```ts
  retro: BodyName[];
  driver?: Driver; // the day's loudest named factor (for copy), if any
```

Update `dayWealth` to populate it — change its body to:

```ts
export function dayWealth(chart: Chart, year: number, month: number, day: number): DayWealth {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const score = wealthScore(chart, date);
  const retro = MONEY_RETRO_BODIES.filter((b) => isRetrograde(b, date));
  return { day, level: wealthLevel(score), intensity: score, retro, driver: dayDriver(chart, date) };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `./node_modules/.bin/vitest run src/lib/astro/wealth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/astro/wealth.ts web/src/lib/astro/wealth.test.ts
git commit -m "feat(wealth): per-day 主驱动 (dayDriver) on DayWealth"
```

---

## Task 3: mergeWindows pure helper

**Files:**
- Modify: `web/src/lib/astro/wealth.ts`
- Test: `web/src/lib/astro/wealth.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it("mergeWindows groups consecutive days, splitting on gaps > maxGap", () => {
  expect(mergeWindows([3, 4, 5, 8, 12, 13], 2)).toEqual([
    { start: 3, end: 5 }, { start: 8, end: 8 }, { start: 12, end: 13 },
  ]);
  expect(mergeWindows([], 2)).toEqual([]);
  expect(mergeWindows([5, 7], 2)).toEqual([{ start: 5, end: 7 }]); // gap 2 ≤ maxGap → merged
  expect(mergeWindows([5, 8], 2)).toEqual([{ start: 5, end: 5 }, { start: 8, end: 8 }]); // gap 3 → split
});
```

- [ ] **Step 2: Run, verify fail** — Run: `./node_modules/.bin/vitest run src/lib/astro/wealth.test.ts` → FAIL (`mergeWindows` undefined).

- [ ] **Step 3: Implement** — add to `wealth.ts`:

```ts
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
```

- [ ] **Step 4: Run, verify pass** — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/astro/wealth.ts web/src/lib/astro/wealth.test.ts
git commit -m "feat(wealth): mergeWindows day-run helper"
```

---

## Task 4: monthEvents + MonthWealth.events

**Files:**
- Modify: `web/src/lib/astro/wealth.ts` (`MonthWealth` ~126, `monthWealth` ~131)
- Test: `web/src/lib/astro/wealth.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it("monthEvents returns 2–4 named windows with a peak day inside each", () => {
  const kevin = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
  const ev = monthEvents(kevin, 2026, 6);
  expect(ev.length).toBeGreaterThanOrEqual(1);
  expect(ev.length).toBeLessThanOrEqual(6); // 少而精
  for (const w of ev) {
    expect(w.peakDay).toBeGreaterThanOrEqual(w.startDay);
    expect(w.peakDay).toBeLessThanOrEqual(w.endDay);
    expect(w.name.length).toBeGreaterThan(0);
  }
  // Kevin's June has a Venus window (early-month stellium hit) and a Mars window (mid).
  expect(ev.map((w) => w.planet)).toContain("Venus");
  expect(ev.map((w) => w.planet)).toContain("Mars");
});

it("monthWealth exposes events; different charts → different events", () => {
  const a = monthWealth(chart, 2026, 6);
  const other = computeChart({ year: 1983, month: 11, day: 2, hour: 14, minute: 20, lat: 22.3, lng: 114.17, tz: 8 });
  const b = monthWealth(other, 2026, 6);
  expect(Array.isArray(a.events)).toBe(true);
  const sig = (m: typeof a) => m.events.map((w) => `${w.planet}:${w.startDay}-${w.endDay}`).join("|");
  expect(sig(a)).not.toBe(sig(b)); // personalized
});
```

- [ ] **Step 2: Run, verify fail** — FAIL (`monthEvents` undefined, `.events` missing).

- [ ] **Step 3: Implement** — add to `wealth.ts`:

```ts
export interface EventWindow {
  planet: BodyName;
  name: string;
  valence: Valence;
  startDay: number;
  endDay: number;
  peakDay: number;
}

// Tightness of a planet's closest event aspect to any money point on a date (0..1).
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
```

Extend `MonthWealth` interface (add field after `goldenDays`):

```ts
  goldenDays: number[];
  events: EventWindow[]; // named money-event windows for the month (Layer 2)
```

In `monthWealth`, add before the `return`:

```ts
  const events = monthEvents(chart, year, month);
```

and change the return to include it: `return { days, goldenDays, events };`

- [ ] **Step 4: Run, verify pass** — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/astro/wealth.ts web/src/lib/astro/wealth.test.ts
git commit -m "feat(wealth): monthEvents — named money-event windows (L2)"
```

---

## Task 5: Freshness contract — decisiveness + personalized events

**Files:**
- Modify: `web/src/__guards__/content-freshness.test.ts`
- Test: same file

- [ ] **Step 1: Write failing tests** — append inside the existing `describe("freshness contract · per-day surfaces differ on ADJACENT days", …)` and personalized blocks (use the file's existing `computeChart` import and its sample charts; if it lacks a second chart, define one inline):

```ts
it("wealth: the month is decisive — not a wall of 平", () => {
  const c = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
  const m = monthWealth(c, 2026, 6);
  const decisive = m.days.filter((d) => d.level !== "ping").length;
  expect(decisive).toBeGreaterThanOrEqual(8); // ≥ ~27% of 30 days carry a verdict
});

it("wealth: named events are personalized (different chart → different windows)", () => {
  const a = monthWealth(computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 }), 2026, 6);
  const b = monthWealth(computeChart({ year: 1990, month: 3, day: 21, hour: 6, minute: 5, lat: 39.9042, lng: 116.4074, tz: 8 }), 2026, 6);
  const sig = (m: typeof a) => m.events.map((w) => `${w.planet}:${w.startDay}`).join("|");
  expect(sig(a)).not.toBe(sig(b));
});
```

- [ ] **Step 2: Run, verify fail/pass correctly** — Run: `./node_modules/.bin/vitest run src/__guards__/content-freshness.test.ts`. These should PASS once Tasks 1–4 are in (they assert real behavior). If `decisive` < 8 for this chart, the gain is mis-set — STOP and re-run the shadow check (Task 7) before adjusting `EVENT_GAIN`.

- [ ] **Step 3: (no impl — guards only)**

- [ ] **Step 4: Run full suite** — `./node_modules/.bin/vitest run` → all green.

- [ ] **Step 5: Commit**

```bash
git add web/src/__guards__/content-freshness.test.ts
git commit -m "test(wealth): freshness guards — decisiveness + personalized events"
```

---

## Task 6: UI — driver copy, event markers, 本月大事件 list

**Files:**
- Modify: `web/src/app/wealth/page.tsx`
- Verify: in-browser (Task 7)

- [ ] **Step 1: Add a planet→glyph/color map** near the top `RETRO_ZH` block:

```ts
const PLANET_GLYPH: Record<string, string> = { Jupiter: "♃", Venus: "♀", Sun: "☉", Mars: "♂", Saturn: "♄", Mercury: "☿" };
function valColor(v: number): string { return v > 0 ? "#7fd99a" : v < 0 ? "#e8736f" : "#aab2c0"; }
```

- [ ] **Step 2: "本月大事件" list** — render after the golden-days banner (after the `✨ 本月搞钱黄金日…` div), using `m.events`:

```tsx
{m.events.length > 0 && (
  <div data-testid="wealth-events" style={{ margin: "4px 0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11, color: "var(--mute)", letterSpacing: ".05em" }}>本月大事件</span>
    {m.events.map((w, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--cream-dim)" }}>
        <span aria-hidden="true" style={{ color: valColor(w.valence) }}>{PLANET_GLYPH[w.planet]}</span>
        <b style={{ color: "var(--cream)" }}>{month}/{w.startDay}{w.endDay > w.startDay ? `–${w.endDay}` : ""}</b>
        <span>{w.name}</span>
        <span aria-hidden="true">{w.valence > 0 ? "🟢" : w.valence < 0 ? "🔴" : "⚪"}</span>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Driver line in day-detail** — inside each of the three level branches' `data-testid="wealth-detail"` blocks is overkill; instead add ONE driver strip right AFTER the level IIFE `})()}` and BEFORE the retro strip:

```tsx
{selData.driver && (
  <div data-testid="wealth-driver" style={{ marginTop: 10, fontSize: 12.5, color: "var(--mute)", display: "flex", alignItems: "center", gap: 7 }}>
    <span aria-hidden="true" style={{ color: valColor(selData.driver.valence) }}>{PLANET_GLYPH[selData.driver.planet]}</span>
    <span>今日主导：<b style={{ color: "var(--cream-dim)" }}>{selData.driver.name}</b></span>
  </div>
)}
```

- [ ] **Step 4: Calendar-cell event marker** — in the day `<button>`, after the retro `逆` badge, add a bottom-left valence dot when the day falls inside any event window:

```tsx
{m.events.some((w) => d.day >= w.startDay && d.day <= w.endDay) && (
  <span aria-hidden="true" style={{ position: "absolute", bottom: 2, left: 3, width: 4, height: 4, borderRadius: 2,
    background: valColor(m.events.find((w) => d.day >= w.startDay && d.day <= w.endDay)!.valence) }} />
)}
```

- [ ] **Step 5: Typecheck + build**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/bun run build`
Expected: clean; `/wealth` in the route list.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/wealth/page.tsx
git commit -m "feat(wealth): UI — 主驱动 line, event markers, 本月大事件 list"
```

---

## Task 7: Pre-deploy verification + ship

**Files:**
- Throwaway: `web/shadow.ts` (NOT committed)
- Throwaway: `web/e2e/_felt-verify.spec.ts` (NOT committed)

- [ ] **Step 1: Shadow distribution check** — write `web/shadow.ts` mirroring the calibration harness (192 charts × 2026), printing the 平/旺/慎 split and avg events/month for the REAL `monthWealth`/`wealthScore`. Run with `/Users/ddd/.bun/bin/bun run shadow.ts`. **Gate:** 平% ∈ [48,58], |旺%−慎%| ≤ 6, events ∈ [2,4]/month. If outside, STOP — re-check `EVENT_GAIN`/orbs, do not deploy. Delete `shadow.ts` after.

- [ ] **Step 2: Full CI gates locally**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run && ./node_modules/.bin/bun run build`
Expected: all green.

- [ ] **Step 3: In-browser presentation verify** — kill any stale dev server (`lsof -ti:3000 | xargs -r kill -9`), then a throwaway Playwright spec (clock-free; reuse the `walkToToday` helper pattern from `e2e/funnel.spec.ts`): load `/wealth`, assert `[data-testid="wealth-events"]` visible with ≥1 row, tap a known event day and assert `[data-testid="wealth-driver"]` shows a planet name; screenshot for eyeball. Delete the spec after.

- [ ] **Step 4: PR**

```bash
git push -u origin feat/wealth-felt-signal
gh pr create --title "feat(wealth): felt daily signal — decisiveness + named money events (L1+L2)" --body "<summary: diagnostic, design, locked knobs, shadow numbers, gates>"
```

- [ ] **Step 5: Merge after CI green** (sync main with `git pull --no-rebase` if base moved; no admin override), then **confirm with Kevin before** `cd web && vercel --prod`. After deploy: grep the live wealth chunk for a new signature (e.g. `本月大事件` / `主导`) to confirm it shipped. Remove the worktree.

---

## Self-Review

**Spec coverage:** L1 decisiveness → Task 1 (eventPressure) + Task 2 (driver). L2 named events → Task 4 (monthEvents) + Task 3 (mergeWindows). Mercury event-only → MONEY_PLANETS table (scoreWeight 0, eventAspects present). UI (driver + events list + markers) → Task 6. Freshness strong-assertions → Task 5. Guardrails (no green flood / decisiveness gate) → Task 5 + Task 7 shadow. Red-line copy → handled in Task 6 strings (action verbs by valence; no hard numbers). Deploy line → Task 7. All spec sections covered.

**Placeholder scan:** PR body in Task 7 Step 4 is the only `<…>` — it's a fill-at-time summary, acceptable. No TODO/TBD in code steps; every code step shows complete code.

**Type consistency:** `Valence`, `Driver`, `DriverTerm`, `MoneyPlanet`, `EventWindow` defined once in Task 1/2/4 and reused consistently. `eventTerms`→`DriverTerm[]`, `dayDriver`→`Driver`, `monthEvents`→`EventWindow[]`, `mergeWindows`→`{start,end}[]`. `DayWealth.driver?` and `MonthWealth.events` match their producers. Import line in Task 1 lists every new symbol used by tests.
