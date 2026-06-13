import { describe, it, expect } from "vitest";
import { computeChart } from "@/lib/astro/chart";
import { generateThemeRead, THEME_IDS } from "./theme";

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });

describe("generateThemeRead", () => {
  it("each theme returns a label + 3 paragraphs woven with a real placement", () => {
    for (const id of THEME_IDS) {
      const r = generateThemeRead(chart, id);
      expect(r.id).toBe(id);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.paragraphs).toHaveLength(3);
      // planetLabel echoes a real sign from the chart (第N宫 format)
      expect(r.planetLabel).toMatch(/第.+宫/);
      expect(r.chips.length).toBeGreaterThanOrEqual(2);
      expect(r.quote.length).toBeGreaterThan(0);
    }
  });

  it("love theme uses the chart's real Venus sign", () => {
    const venus = chart.placements.find((p) => p.body === "Venus")!;
    expect(generateThemeRead(chart, "love").planetLabel).toContain(venus.sign);
  });

  it("is deterministic", () => {
    expect(generateThemeRead(chart, "self").paragraphs[0].text).toBe(
      generateThemeRead(chart, "self").paragraphs[0].text,
    );
  });

  it("marks the last paragraph as the catch line", () => {
    expect(generateThemeRead(chart, "lonely").paragraphs[2].catch).toBe(true);
  });
});
