import { describe, it, expect } from "vitest";
import { computeChart } from "../astro/chart";
import { dayWealth } from "../astro/wealth";
import { validateMoneyCopy } from "../money/guardrail";
import { todayVerdict } from "./todayVerdict";
import { seed, withConfidence } from "../astro/timeBelief";
import type { TimeBelief } from "../astro/rectify";

// ─────────────────────────────────────────────────────────────────────────────
// T3-P3 · belief → todayVerdict (闭 B×D 环) — belief only sharpens PERSONALIZATION
// DEPTH (planet ↔ house naming of the natal hit). It must NEVER touch `state`.
//
// The whole point: a NARROWED belief (mode='house', confidence≥0.5) lets us name
// the natal hit by 宫位 (e.g. 你的财帛宫) — house placement depends on a trustworthy
// birth hour, so we only speak it once the belief supports it. A WIDE belief
// (mode='planet', the first-2-weeks default) degrades to 行星↔行星 only, skipping
// houses/ASC — and the verdict still stands COMPLETE on its own.
//
// 承重不变量 (also held by edge-preservation.test.ts): `state` is read off the real
// sky (dayWealth) and is INVARIANT to belief. Same (chart,date), any belief → same
// state. belief enriches DEPTH, not the red/green/plain verdict.
// ─────────────────────────────────────────────────────────────────────────────

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

const birth = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };

// A genuinely WIDE belief (no events → flat prior, planet mode) and a SHARP one
// (same band, pushed over the house threshold via withConfidence — same trick the
// freshness registry uses, since real events on this seed top out below 0.5).
const wide: TimeBelief = seed(birth, []);
const house: TimeBelief = withConfidence(seed(birth, []), 0.6);

const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i, 12));

describe("T3-P3 · belief.mode sharpens the natal-hit DEPTH but never the state", () => {
  it("fixture precondition: wide is planet-mode, house is house-mode", () => {
    expect(wide.mode).toBe("planet");
    expect(house.mode).toBe("house");
  });

  it("house belief names the hit by 宫位 (more specific) where planet belief only by 行星 — natalHit differs", () => {
    // Walk a year; on every day where the depth diverges, house-mode names a
    // concrete birth-hour-dependent point (a 宫, or 上升/天顶 for an angle) that the
    // wide planet-mode does NOT — and on the planet-target days that means a 宫.
    let divergent = 0;
    let nameAHouse = 0; // days house-mode specifically reaches 宫位 (planet target)
    for (let i = 0; i < 365; i++) {
      const p = todayVerdict(A, day(i), wide);
      const h = todayVerdict(A, day(i), house);
      // state is invariant (asserted hard below); here we hunt for depth divergence
      if (p.natalHit !== h.natalHit) {
        divergent++;
        // house-mode reads a birth-hour-dependent point; planet-mode never names a 宫
        expect(h.natalHit, `house hit not more specific on doy ${i}`).toMatch(/宫|上升|天顶/);
        expect(p.natalHit, `planet hit must NOT name a 宫 on doy ${i}`).not.toMatch(/宫/);
        if (/宫/.test(h.natalHit)) nameAHouse++;
      }
    }
    expect(divergent, "house-mode never added specificity — enrichment is vacuous").toBeGreaterThan(20);
    expect(nameAHouse, "house-mode never reached 宫位 — the core house enrichment is vacuous").toBeGreaterThan(10);
  });

  it("the enriched DEPTH reaches the user-facing line too (house line ≠ planet line on those days)", () => {
    let moved = 0;
    for (let i = 0; i < 365; i++) {
      const p = todayVerdict(A, day(i), wide);
      const h = todayVerdict(A, day(i), house);
      if (p.natalHit !== h.natalHit) {
        moved++;
        expect(h.line, `house depth did not reach the line on doy ${i}`).not.toBe(p.line);
      }
    }
    expect(moved, "depth never reached the line").toBeGreaterThan(20);
  });
});

describe("T3-P3 · 承重不变量 — belief NEVER moves state (red/green/plain stays from the sky)", () => {
  it("same (chart,date): wide-belief, house-belief, and no-belief all yield the SAME state, every day, every chart", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 365; i++) {
        const d = day(i);
        const w = dayWealth(chart, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        const expected = w.level === "shen" ? "red" : w.level === "wang" ? "green" : "plain";
        const none = todayVerdict(chart, d).state;
        const planet = todayVerdict(chart, d, wide).state;
        const houseS = todayVerdict(chart, d, house).state;
        expect(none, `no-belief state diverged on doy ${i}`).toBe(expected);
        expect(planet, `planet-belief state diverged on doy ${i}`).toBe(expected);
        expect(houseS, `house-belief state diverged on doy ${i}`).toBe(expected);
      }
    }
  });

  it("belief cannot drop or add a red day — the red SET is identical under wide / house / no belief", () => {
    for (const chart of [A, B, C]) {
      const reds = (b?: TimeBelief) =>
        Array.from({ length: 365 }, (_, i) => todayVerdict(chart, day(i), b).state).filter((s) => s === "red").length;
      const base = reds(undefined);
      expect(base, "vacuous: chart has no red days").toBeGreaterThan(0);
      expect(reds(wide), "wide belief changed the red count").toBe(base);
      expect(reds(house), "house belief changed the red count").toBe(base);
    }
  });
});

describe("T3-P3 · 诚实注脚① — planet mode (the first-2-weeks default) stands COMPLETE alone", () => {
  it("with a WIDE belief (or none) the verdict never throws and is never empty — planet carries the load", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 60; i++) {
        const d = day(i);
        for (const b of [undefined, wide] as const) {
          const v = todayVerdict(chart, d, b);
          expect(v.line.length, "empty line under wide belief").toBeGreaterThan(8);
          expect(v.quote.length, "empty quote under wide belief").toBeGreaterThan(4);
          expect(v.natalHit.length, "empty natalHit under wide belief").toBeGreaterThan(0);
          // planet-mode never names a 宫 (no birth-hour trust to back it)
          expect(v.natalHit, "planet-mode named a 宫 it can't trust").not.toMatch(/宫/);
          // still honest-but-safe under the money guardrail
          expect(validateMoneyCopy(v.line).ok, `line failed guardrail: ${v.line}`).toBe(true);
          expect(validateMoneyCopy(v.natalHit).ok, `natalHit failed guardrail: ${v.natalHit}`).toBe(true);
        }
      }
    }
  });

  it("default (no belief arg) is byte-identical to passing the wide planet belief — backward compatible", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 60; i++) {
        expect(todayVerdict(chart, day(i))).toEqual(todayVerdict(chart, day(i), wide));
      }
    }
  });
});
