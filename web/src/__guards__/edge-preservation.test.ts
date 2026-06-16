import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "../lib/astro/chart";
import { dayWealth } from "../lib/astro/wealth";
import { todayVerdict, type TodayVerdict } from "../lib/reading/todayVerdict";
import { seed, refine } from "../lib/astro/timeBelief";
import { confirmVerdict } from "../lib/reading/calibrationSignal";
import type { LifeEvent } from "../lib/astro/rectify";
import { validateMoneyCopy } from "../lib/money/guardrail";

// ─────────────────────────────────────────────────────────────────────────────
// 棱角守护 · EDGE-PRESERVATION GUARD (T3 Phase 7 · charter v1.6 · 宪法 §8 真vs编 · §4.4 情感诚实)
//
// The calibration loop (T3) tightens ONE thing — how precisely we know her birth
// HOUR. That is its entire mandate. It must NEVER buy that precision by softening
// what Molly actually says: calibration may not turn a 慎(red) day green, may not
// thin out red days, and may not filter the honest/戳痛 lines down to only the
// 顺耳 ones just because she "confirmed / loves hearing it".
//
// Constitution §8 三条亮线 (真vs编): an effect that flatters her by EDITING the
// real sky is 编 (manufactured) — a 一票否决 redline. The verdict's red/green/plain
// is read off the real sky (dayWealth = 相位/财运), and applause (她点"准") is a
// signal about the birth HOUR, not a vote on whether today should be a good day.
//
// This file is the REGRESSION GUARD that keeps that wall standing. It would fail
// the moment a future change wired belief/applause into a path that could mute a
// red day or re-shape the verdict to please her. Strong assertions only — no
// Set(...).size weak forms (CLAUDE.md R15).
// ─────────────────────────────────────────────────────────────────────────────

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const move: LifeEvent = { kind: "move", year: 2019, month: 3 };
const career: LifeEvent = { kind: "career", year: 2021, month: 9 };

const YEAR_DAYS = 365;
const dayAt = (i: number) => new Date(Date.UTC(2026, 0, 1 + i, 12));

// The full set of (state) verdicts across a year — the thing calibration must not edit.
function stateGrid(chart: ReturnType<typeof computeChart>): TodayVerdict["state"][] {
  return Array.from({ length: YEAR_DAYS }, (_, i) => todayVerdict(chart, dayAt(i)).state);
}
function countRed(chart: ReturnType<typeof computeChart>): number {
  return stateGrid(chart).filter((s) => s === "red").length;
}

describe("棱角守护 · the verdict surface has NO calibration door (state is read off the real sky)", () => {
  it("verdict state is a PURE function of (chart, date) — its only driver is dayWealth (相位/财运), not belief", () => {
    // The structural guarantee: todayVerdict cannot take a belief, so calibration
    // physically cannot reach in to soften it. Prove state tracks dayWealth.level
    // exactly, every day of the year, for clearly-different charts.
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const date = dayAt(i);
        const w = dayWealth(chart, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
        const expected = w.level === "shen" ? "red" : w.level === "wang" ? "green" : "plain";
        expect(todayVerdict(chart, date).state, `state diverged from wealth on doy ${i}`).toBe(expected);
      }
    }
  });

  it("todayVerdict is deterministic — re-reading the same (chart, date) is byte-identical (no hidden mood/belief state)", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 30; i++) {
        expect(todayVerdict(chart, dayAt(i))).toEqual(todayVerdict(chart, dayAt(i)));
      }
    }
  });

  it("each chart actually HAS red days — the guard isn't vacuously protecting an empty set", () => {
    // 慎 is rare-by-quota, but a year must surface some — otherwise 'red days don't
    // drop' is trivially true. Confirm the redline has real teeth.
    for (const chart of [A, B, C]) {
      expect(countRed(chart), "no red days in a whole year — red-preservation is vacuous").toBeGreaterThan(0);
    }
  });
});

describe("棱角守护 · applause (她点'准'/她爱听) cannot soften the sky, only sharpen the hour", () => {
  it("confirming an angle verdict moves ONLY confidence — the hour distribution (buckets/topRange) is preserved", () => {
    const before = seed(birth, [move, career]);
    const after = confirmVerdict(before, "ASC");
    // it DID register (confidence up) ...
    expect(after.confidence).toBeGreaterThan(before.confidence);
    // ... but it did NOT re-shape WHERE the hour is — applause is not new evidence
    // about the distribution, just a tick of certainty in the band we already had.
    expect(after.buckets).toEqual(before.buckets);
    expect(after.topRange).toEqual(before.topRange);
  });

  it("a pure-planet '准' (the kind of applause that says nothing about her hour) moves NOTHING", () => {
    const before = seed(birth, [move]);
    // 真vs编: feeding the belief from a planet confirmation would be inventing
    // calibration she never gave — manufactured precision. So it must be identity.
    expect(confirmVerdict(before, "Mars")).toEqual(before);
    expect(confirmVerdict(before, "Sun")).toEqual(before);
  });

  it("no amount of applause manufactures god-view — repeated confirms stay capped below confidence=1", () => {
    let b = seed(birth, [move, career]);
    for (let i = 0; i < 500; i++) b = refine(b, { type: "confirm" });
    // §4.4/§8: we never pretend to KNOW her birth minute just because she keeps
    // agreeing. The ceiling is the honesty floor.
    expect(b.confidence).toBeLessThan(1);
  });
});

describe("棱角守护 · calibration cannot thin out red days, nor convert 慎→green to please her", () => {
  it("the year's red-day SET is fixed by the sky and unmoved by any belief state", () => {
    // There is no API by which a sharpened belief feeds back into todayVerdict's
    // state, so the red grid is invariant by construction. We assert it directly:
    // the exact identity of every red day is reproducible from wealth alone, with
    // no belief in the loop. (If a future change adds a belief param that drops a
    // red day, this — and the pure-function test above — go red.)
    for (const chart of [A, B, C]) {
      const grid1 = stateGrid(chart);
      // re-derive purely from wealth, no verdict/belief involved
      const grid2 = Array.from({ length: YEAR_DAYS }, (_, i) => {
        const d = dayAt(i);
        const w = dayWealth(chart, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        return w.level === "shen" ? "red" : w.level === "wang" ? "green" : "plain";
      });
      expect(grid1).toEqual(grid2);
    }
  });

  it("confirming TODAY's verdict does not change tomorrow's (or today's re-read) state — applause is not a forecast vote", () => {
    // Simulate the daily loop: she confirms an angle verdict every day for a year.
    // The verdict surface must be untouched by that stream of applause.
    let belief = seed(birth, [move, career]);
    for (let i = 0; i < YEAR_DAYS; i++) {
      const dateToday = dayAt(i);
      const before = todayVerdict(A, dateToday);
      belief = confirmVerdict(belief, "ASC"); // she taps 准 on an angle verdict
      const after = todayVerdict(A, dateToday); // re-read the SAME day
      expect(after, `applause edited the same-day verdict on doy ${i}`).toEqual(before);
    }
  });
});

describe("棱角守护 · honesty preserved — red/慎 copy stays a real, edged judgement (not filtered to 顺耳)", () => {
  it("red days still deliver an edged 收手/按手 line AND keep the red door — calibration never mutes them", () => {
    // §4.4 情感诚实: the 慎 cell is allowed to be uncomfortable (按住手/别被推着花).
    // Walk every red day of the year and confirm it still: (1) carries a non-empty
    // line, (2) keeps its door (a red day without a door is a softened red day),
    // (3) is honest-but-safe — passes money/guardrail (no invented bad outcome).
    let redSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = todayVerdict(chart, dayAt(i));
        if (v.state !== "red") continue;
        redSeen++;
        expect(v.line.length, `red line empty on doy ${i}`).toBeGreaterThan(0);
        expect(v.doorDate, `red day lost its door on doy ${i}`).toBeTruthy();
        // honest, not 编: passes the same gate all money copy passes — no shame,
        // no amount-prediction, no gamble. Edged ≠ manufactured fear.
        expect(validateMoneyCopy(v.line).ok, `red line failed guardrail on doy ${i}: ${v.line}`).toBe(true);
        expect(validateMoneyCopy(v.quote).ok, `red quote failed guardrail on doy ${i}`).toBe(true);
      }
    }
    expect(redSeen, "no red days exercised — honesty check vacuous").toBeGreaterThan(0);
  });

  it("the guard/push lean tones both survive — copy is not flattened to a single 顺耳 voice", () => {
    // If calibration ever 'optimised for what she loves to hear', the edged
    // push-lean ('越是手痒越要按一按') and the steadier guard-lean would collapse
    // toward one bland line. Two charts of opposite lean must still read different
    // on the SAME red/green day. (lean is chart-fixed, never moved by belief.)
    const leanGuard = todayVerdict(B, dayAt(160)).lean; // B leans 'guard'
    expect(leanGuard).not.toBe(todayVerdict(A, dayAt(160)).lean); // A leans 'even'
    // and across the year the two charts never collapse to identical lines on a
    // shared-state day (the edged voice persists per-chart).
    let shared = 0;
    for (let i = 0; i < YEAR_DAYS; i++) {
      const a = todayVerdict(A, dayAt(i));
      const b = todayVerdict(B, dayAt(i));
      if (a.state !== b.state) continue;
      shared++;
      expect(a.line, `A/B collapsed to one voice on doy ${i}`).not.toBe(b.line);
    }
    expect(shared, "too few shared-state A/B days").toBeGreaterThan(100);
  });
});
