import { describe, it, expect } from "vitest";
import type { BirthInput } from "./chart";
import { rectify, type LifeEvent } from "./rectify";

// A real birth (Melbourne) — same sample used by wealth.test.ts so the angles
// are exercised the same way the rest of the suite trusts them.
const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };

const move: LifeEvent = { kind: "move", year: 2019, month: 3 };
const career: LifeEvent = { kind: "career", year: 2021, month: 9 };
const relationship: LifeEvent = { kind: "relationship", year: 2017, month: 6 };

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

describe("rectify — time-belief from life events hitting the angles", () => {
  it("is deterministic: same (birth, events) → toEqual", () => {
    const a = rectify(birth, [move, career]);
    const b = rectify(birth, [move, career]);
    expect(a).toEqual(b);
  });

  it("buckets are a normalized distribution (sum ≈ 1)", () => {
    const r = rectify(birth, [move]);
    expect(r.buckets.length).toBe(24);
    expect(sum(r.buckets)).toBeCloseTo(1, 6);
    for (const w of r.buckets) expect(w).toBeGreaterThanOrEqual(0);
  });

  it("no events → uniform distribution, mode='planet', confidence≈0", () => {
    const r = rectify(birth, []);
    expect(r.mode).toBe("planet");
    expect(r.confidence).toBeCloseTo(0, 6);
    // every bucket identical (uniform): max - min ≈ 0
    const lo = Math.min(...r.buckets);
    const hi = Math.max(...r.buckets);
    expect(hi - lo).toBeCloseTo(0, 9);
  });

  it("more events → higher confidence than a single event (cross-narrowing)", () => {
    const one = rectify(birth, [move]);
    const three = rectify(birth, [move, career, relationship]);
    expect(three.confidence).toBeGreaterThan(one.confidence);
  });

  it("adding an event never widens topRange (monotonic narrowing)", () => {
    const span = (r: { topRange: [number, number] }) => {
      const [a, b] = r.topRange;
      return a <= b ? b - a : b + 24 - a; // wrap-aware width
    };
    const r1 = rectify(birth, [move]);
    const r2 = rectify(birth, [move, career]);
    const r3 = rectify(birth, [move, career, relationship]);
    expect(span(r2)).toBeLessThanOrEqual(span(r1));
    expect(span(r3)).toBeLessThanOrEqual(span(r2));
  });

  it("confidence never reaches 1 (never god-mode certain about the hour)", () => {
    const r = rectify(birth, [move, career, relationship]);
    expect(r.confidence).toBeLessThan(1);
  });

  it("mode flips to 'house' only once confidence crosses the threshold", () => {
    const wide = rectify(birth, []); // confidence 0
    expect(wide.mode).toBe("planet");
    // A belief with enough corroboration crosses into house mode; the engine
    // must map mode strictly from confidence (no other input).
    const many = rectify(birth, [move, career, relationship, { kind: "family", year: 2015, month: 1 }, { kind: "health", year: 2013, month: 8 }]);
    if (many.confidence >= 0.5) expect(many.mode).toBe("house");
    else expect(many.mode).toBe("planet");
  });
});
