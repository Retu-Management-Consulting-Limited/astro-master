import { describe, it, expect } from "vitest";
import { computeChart } from "../astro/chart";
import { dayWealth } from "../astro/wealth";
import { validateMoneyCopy } from "../money/guardrail";
import { todayVerdict, type TodayState } from "./todayVerdict";

// Two deliberately dissimilar natal charts (same fixtures the freshness registry
// uses) + a third, so the personalization assertions bite on real differences.
const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day, 12, 0));

// First date in 2026-06 whose dayWealth.level matches a target, or null if the
// chart simply has no such day that month (e.g. fixture B has no 旺 day in 6/2026).
function maybeDay(chart: typeof A, level: "wang" | "ping" | "shen"): Date | null {
  for (let day = 1; day <= 30; day++) {
    if (dayWealth(chart, 2026, 6, day).level === level) return d(2026, 6, day);
  }
  return null;
}
function findDay(chart: typeof A, level: "wang" | "ping" | "shen"): Date {
  const day = maybeDay(chart, level);
  if (!day) throw new Error(`no ${level} day found in 2026-06 for fixture`);
  return day;
}

describe("todayVerdict · three-state ← wealth level", () => {
  it("level shen → state red, wang → green, ping → plain (1:1, no other mapping)", () => {
    for (const chart of [A, B, C]) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const w = dayWealth(chart, 2026, 6, day);
        const v = todayVerdict(chart, date);
        const expected: TodayState =
          w.level === "shen" ? "red" : w.level === "wang" ? "green" : "plain";
        expect(v.state, `day ${day}`).toBe(expected);
      }
    }
  });

  it("intensity is carried straight through from dayWealth().intensity", () => {
    for (let day = 1; day <= 30; day++) {
      const date = d(2026, 6, day);
      const w = dayWealth(A, 2026, 6, day);
      expect(todayVerdict(A, date).intensity).toBe(w.intensity);
    }
  });
});

describe("todayVerdict · per-state contract (red door / green action+verify / plain prep)", () => {
  it("RED day always carries a doorDate pointing to THAT day's wealth calendar", () => {
    const date = findDay(B, "shen");
    const v = todayVerdict(B, date);
    expect(v.state).toBe("red");
    // doorDate is the same calendar day, yyyy-mm-dd, so /wealth?selDay= lands on it
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    expect(v.doorDate).toBe(`${yyyy}-${mm}-${dd}`);
    expect(v.line.length).toBeGreaterThan(8);
  });

  it("GREEN day carries an action AND a retrospective check '你动了吗' (verification, not prediction)", () => {
    const date = findDay(A, "wang");
    const v = todayVerdict(A, date);
    expect(v.state).toBe("green");
    expect(v.action && v.action.length).toBeGreaterThan(4);
    expect(v.askDidYouAct && v.askDidYouAct.length).toBeGreaterThan(2);
    // the check is retrospective ("你动了吗") — asks whether they acted, not a forecast
    expect(v.askDidYouAct).toMatch(/动了吗|做了吗|去了吗|推了吗/);
  });

  it("PLAIN day carries a non-empty prep (something to ready, not a void)", () => {
    const date = findDay(C, "ping");
    const v = todayVerdict(C, date);
    expect(v.state).toBe("plain");
    expect(v.prep && v.prep.length).toBeGreaterThan(4);
  });

  it("only the matching state's slot is filled (red→door, green→action, plain→prep)", () => {
    expect(todayVerdict(B, findDay(B, "shen")).action).toBeUndefined();
    expect(todayVerdict(A, findDay(A, "wang")).doorDate).toBeUndefined();
    expect(todayVerdict(C, findDay(C, "ping")).doorDate).toBeUndefined();
    expect(todayVerdict(C, findDay(C, "ping")).action).toBeUndefined();
  });
});

describe("todayVerdict · lean ← Mars/Saturn dominance in the natal chart", () => {
  it("lean is one of the declared phenotypes and is stable for a given chart", () => {
    const v1 = todayVerdict(A, d(2026, 6, 10));
    const v2 = todayVerdict(A, d(2026, 6, 22));
    expect(v1.lean).toBe(v2.lean); // a phenotype, not a per-day thing
    expect(["push", "guard", "even"]).toContain(v1.lean);
  });

  it("two charts of different Mars/Saturn dominance get DIFFERENT leans (personalized, strongest form)", () => {
    // STRONG: a direct not.toBe between two specific dissimilar charts — the
    // banned `new Set(...).size > 1` form hid that A and C both render 'even'
    // (it passed only because B happened to differ). A 'even'-Mars/Saturn-balanced
    // chart (A) and a Saturn-dominant chart (B) must NOT share a lean.
    const leanA = todayVerdict(A, d(2026, 6, 10)).lean;
    const leanB = todayVerdict(B, d(2026, 6, 10)).lean;
    expect(leanA, `A and B share lean ${leanA}`).not.toBe(leanB);
    // and the lean is a declared phenotype value, not garbage
    for (const l of [leanA, leanB]) expect(["push", "guard", "even"]).toContain(l);
  });
});

describe("todayVerdict · voice = decisive with warmth (constitution §5/§8)", () => {
  it("every rendered string passes the money copy guardrail (no number/shame/gamble)", () => {
    for (const chart of [A, B, C]) {
      for (let day = 1; day <= 30; day++) {
        const v = todayVerdict(chart, d(2026, 6, day));
        for (const s of [v.line, v.action, v.prep, v.askDidYouAct, v.quote]) {
          if (!s) continue;
          const r = validateMoneyCopy(s);
          expect(r.ok, `"${s}" → ${r.reason}`).toBe(true);
        }
      }
    }
  });

  it("no fabricated-negative / shame leverage in any state (red caution stays a door, not a threat)", () => {
    for (const chart of [A, B, C]) {
      for (let day = 1; day <= 30; day++) {
        const v = todayVerdict(chart, d(2026, 6, day));
        const all = [v.line, v.action, v.prep, v.askDidYouAct, v.quote].filter(Boolean).join(" ");
        expect(all).not.toMatch(/会更穷|越来越穷|完蛋|破产|活该|没救|你就完了/);
      }
    }
  });

  it("the line carries warmth, not a bare verdict (every realized state has a human line)", () => {
    let asserted = 0;
    for (const chart of [A, B, C]) {
      for (const lvl of ["wang", "ping", "shen"] as const) {
        const date = maybeDay(chart, lvl); // not every chart has every level in 6/2026
        if (!date) continue;
        const v = todayVerdict(chart, date);
        expect(v.line.length, `${lvl} line too thin`).toBeGreaterThan(8);
        asserted++;
      }
    }
    // all three states are covered across the fixture set (red/green/plain each hit)
    expect(asserted).toBeGreaterThanOrEqual(3);
  });
});

describe("todayVerdict · per-day freshness (adjacent days that change state must change line)", () => {
  it("STRONG: when adjacent days differ in state, the line differs too (no frozen copy)", () => {
    for (const chart of [A, B, C]) {
      for (let day = 1; day < 30; day++) {
        const a = todayVerdict(chart, d(2026, 6, day));
        const b = todayVerdict(chart, d(2026, 6, day + 1));
        if (a.state !== b.state) expect(a.line).not.toBe(b.line);
      }
    }
  });

  it("STRONG: adjacent SAME-STATE days rotate their copy — the '换了一天还一样' invariant", () => {
    // This is the exact 2026-06-15 failure mode the freshness registry exists to
    // catch: same content, different day, SAME state. The state-change guard above
    // says nothing about it. Here we walk a full year per chart and assert that
    // wherever two consecutive days share a state, BOTH the line and the quote
    // differ — and that the window actually contains enough same-state pairs that
    // the assertion is not vacuously true.
    for (const chart of [A, B, C]) {
      let sameStatePairs = 0;
      let prev: ReturnType<typeof todayVerdict> | null = null;
      for (let i = 0; i < 365; i++) {
        const v = todayVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12)));
        if (prev && prev.state === v.state) {
          sameStatePairs++;
          expect(prev.line, `frozen line across adjacent same-state days (day-of-year ${i})`).not.toBe(v.line);
          expect(prev.quote, `frozen quote across adjacent same-state days (day-of-year ${i})`).not.toBe(v.quote);
        }
        prev = v;
      }
      // guard against a vacuous pass: a year always has many same-state runs
      expect(sameStatePairs, `too few same-state adjacent pairs to test rotation`).toBeGreaterThan(50);
    }
  });

  it("STRONG: a red day and a green day for the same chart never share the same line", () => {
    // pick a real red and a real green day on whichever chart has both
    for (const chart of [A, B, C]) {
      let red: Date | null = null;
      let green: Date | null = null;
      for (let day = 1; day <= 30; day++) {
        const lvl = dayWealth(chart, 2026, 6, day).level;
        if (lvl === "shen" && !red) red = d(2026, 6, day);
        if (lvl === "wang" && !green) green = d(2026, 6, day);
      }
      if (red && green) {
        expect(todayVerdict(chart, red).line).not.toBe(todayVerdict(chart, green).line);
      }
    }
  });
});
