import { describe, it, expect } from "vitest";
import { biorhythm, biorhythmSeries, criticalDims, daysSinceBirth, pct, parseBirthDate } from "./biorhythm";

const d = (s: string) => new Date(s + "T00:00:00");

describe("biorhythm", () => {
  it("counts whole calendar days since birth (DST-safe)", () => {
    expect(daysSinceBirth(d("2000-01-01"), d("2000-01-01"))).toBe(0);
    expect(daysSinceBirth(d("2000-01-01"), d("2000-01-02"))).toBe(1);
    expect(daysSinceBirth(d("2000-01-31"), d("2000-02-01"))).toBe(1); // month boundary
    expect(daysSinceBirth(d("1999-12-31"), d("2000-01-01"))).toBe(1); // year boundary
  });

  it("is exactly 0 on the birth day (t=0 → sin 0)", () => {
    const r = biorhythm(d("1998-06-13"), d("1998-06-13"));
    expect(r.physical).toBe(0);
    expect(r.emotional).toBe(0);
    expect(r.intellectual).toBe(0);
  });

  it("emotional peaks (=+1) a quarter-period (7d) after birth; back to 0 at a full 28d", () => {
    expect(biorhythm(d("2000-01-01"), d("2000-01-08")).emotional).toBeCloseTo(1, 10); // t=7, sin(π/2)
    expect(biorhythm(d("2000-01-01"), d("2000-01-29")).emotional).toBeCloseTo(0, 10); // t=28, sin(2π)
  });

  it("physical returns to ~0 after a full 23-day period", () => {
    expect(biorhythm(d("2000-01-01"), d("2000-01-24")).physical).toBeCloseTo(0, 10); // t=23
  });

  it("series spans [-span,+span] and its offset-0 point equals biorhythm at center", () => {
    const s = biorhythmSeries(d("1998-06-13"), d("2026-06-15"), 7);
    expect(s).toHaveLength(15);
    expect(s[0].offset).toBe(-7);
    expect(s[14].offset).toBe(7);
    const mid = s.find((p) => p.offset === 0)!;
    expect(mid.rhythm).toEqual(biorhythm(d("1998-06-13"), d("2026-06-15")));
  });

  it("flags a 临界日 when a curve crosses zero today (emotional at t=14)", () => {
    // born 2000-01-01, +14d = 2000-01-15 → emotional sin(π)=0 → critical
    expect(criticalDims(d("2000-01-01"), d("2000-01-15"))).toContain("emotional");
    // a random non-crossing day shouldn't flag emotional
    expect(criticalDims(d("2000-01-01"), d("2000-01-05"))).not.toContain("emotional");
  });

  it("DYNAMIC: adjacent days differ, and a different birthday gives a different curve (strong, not Set-size)", () => {
    const a = biorhythm(d("1998-06-13"), d("2026-06-15")).physical;
    const b = biorhythm(d("1998-06-13"), d("2026-06-16")).physical;
    expect(a).not.toBe(b); // the curve moves day to day
    const other = biorhythm(d("1990-03-20"), d("2026-06-15")).physical;
    expect(other).not.toBe(a); // a different person's curve is genuinely different
  });

  it("pct rounds to integer percent; parseBirthDate handles bad input", () => {
    expect(pct(1)).toBe(100);
    expect(pct(-0.5)).toBe(-50);
    expect(parseBirthDate("1998-06-13")?.getFullYear()).toBe(1998);
    expect(parseBirthDate("nope")).toBeNull();
  });
});
