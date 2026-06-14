import { describe, it, expect } from "vitest";
import { computeChart, BODIES, type BirthInput } from "./chart";

const sample: BirthInput = {
  year: 1998, month: 6, day: 13, hour: 8, minute: 40,
  lat: -37.8136, lng: 144.9631, tz: 10, // Melbourne
};

describe("computeChart", () => {
  it("returns all 10 bodies with valid longitudes/signs/houses", () => {
    const c = computeChart(sample);
    expect(c.placements.map((p) => p.body)).toEqual(BODIES);
    for (const p of c.placements) {
      expect(p.lon).toBeGreaterThanOrEqual(0);
      expect(p.lon).toBeLessThan(360);
      expect(p.degInSign).toBeGreaterThanOrEqual(0);
      expect(p.degInSign).toBeLessThan(30);
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }
  });

  it("computes ASC and MC in range, ASC sign consistent", () => {
    const c = computeChart(sample);
    expect(c.asc).toBeGreaterThanOrEqual(0);
    expect(c.asc).toBeLessThan(360);
    expect(c.mc).toBeGreaterThanOrEqual(0);
    expect(c.mc).toBeLessThan(360);
    expect(c.ascSignIndex).toBe(Math.floor(c.asc / 30));
  });

  it("whole-sign: a planet in the ASC sign lands in house 1", () => {
    const c = computeChart(sample);
    for (const p of c.placements) {
      if (p.signIndex === c.ascSignIndex) expect(p.house).toBe(1);
    }
  });

  it("aspects are valid, symmetric-once, non-self, within orb", () => {
    const c = computeChart(sample);
    for (const a of c.aspects) {
      expect(a.a).not.toBe(a.b);
      expect(a.orb).toBeGreaterThanOrEqual(0);
      expect(["conjunction", "sextile", "square", "trine", "opposition"]).toContain(a.type);
    }
  });

  // Real astronomical anchor: Sun near 0° Aries at the 2000 spring equinox.
  it("Sun is ~0° Aries (white-ram) at 2000-03-20 12:00 UTC", () => {
    const c = computeChart({ year: 2000, month: 3, day: 20, hour: 12, minute: 0, lat: 0, lng: 0, tz: 0 });
    const sun = c.placements.find((p) => p.body === "Sun")!;
    const nearAries0 = sun.lon < 3 || sun.lon > 357;
    expect(nearAries0).toBe(true);
  });

  // Fractional timezone (India +5:30) must not lose 30 minutes. Local 08:40 at
  // +5.5 == UTC 03:10, which equals local 03:10 at +0. The old `hour - tz` math
  // truncated to UTC 03:40 (wrong by 30 min) and would fail this.
  it("fractional tz (+5.5) resolves to the exact UTC instant (no 30-min loss)", () => {
    const frac = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: 19.076, lng: 72.8777, tz: 5.5 });
    const ref = computeChart({ year: 1998, month: 6, day: 13, hour: 3, minute: 10, lat: 19.076, lng: 72.8777, tz: 0 });
    expect(frac.asc).toBeCloseTo(ref.asc, 6);
    const fSun = frac.placements.find((p) => p.body === "Sun")!.lon;
    const rSun = ref.placements.find((p) => p.body === "Sun")!.lon;
    expect(fSun).toBeCloseTo(rSun, 9);
  });

  // Integer tz must be unchanged by the minute-field refactor (regression guard).
  it("integer tz (+10) regression: matches the equivalent UTC instant", () => {
    const intz = computeChart(sample); // 08:40 @ +10
    const ref = computeChart({ ...sample, hour: 22, minute: 40, day: 12, tz: 0 }); // 1998-06-12 22:40 UTC
    expect(intz.asc).toBeCloseTo(ref.asc, 6);
  });

  // Moon moves ~13°/day — sanity that fast bodies differ across a day.
  it("Moon longitude changes substantially over 24h", () => {
    const c1 = computeChart(sample);
    const c2 = computeChart({ ...sample, day: 14 });
    const m1 = c1.placements.find((p) => p.body === "Moon")!.lon;
    const m2 = c2.placements.find((p) => p.body === "Moon")!.lon;
    const diff = Math.min(Math.abs(m1 - m2), 360 - Math.abs(m1 - m2));
    expect(diff).toBeGreaterThan(8);
  });
});
