import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "./chart";
import { wealthScore, wealthLevel, dayWealth, monthWealth } from "./wealth";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

describe("wealth calendar", () => {
  it("wealthScore is 0..100", () => {
    for (let d = 1; d <= 28; d++) {
      const s = wealthScore(chart, new Date(Date.UTC(2026, 5, d, 12, 0)));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("wealthLevel thresholds (green/white/red)", () => {
    expect(wealthLevel(80)).toBe("wang");
    expect(wealthLevel(50)).toBe("ping");
    expect(wealthLevel(30)).toBe("shen");
  });

  it("monthWealth returns full month + ≤2 golden days, all 旺", () => {
    const m = monthWealth(chart, 2026, 6);
    expect(m.days.length).toBe(30);
    expect(m.goldenDays.length).toBeLessThanOrEqual(2);
    for (const g of m.goldenDays) {
      expect(dayWealth(chart, 2026, 6, g).level).toBe("wang");
    }
  });

  it("levels vary across the month (not all identical)", () => {
    const m = monthWealth(chart, 2026, 6);
    const levels = new Set(m.days.map((d) => d.level));
    expect(levels.size).toBeGreaterThan(1);
  });
});
