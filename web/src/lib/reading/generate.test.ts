import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { detectHighlights } from "@/lib/astro/highlights";
import { generateFirstRead } from "./generate";

const sample: BirthInput = {
  year: 1998, month: 6, day: 13, hour: 8, minute: 40,
  lat: -37.8136, lng: 144.9631, tz: 10,
};

describe("highlights + first-read", () => {
  it("detects up to 5 ranked highlights with valid fields", () => {
    const c = computeChart(sample);
    const hs = detectHighlights(c);
    expect(hs.length).toBeGreaterThan(0);
    expect(hs.length).toBeLessThanOrEqual(5);
    for (const h of hs) {
      expect(h.summary.length).toBeGreaterThan(0);
      expect(typeof h.score).toBe("number");
    }
    // sorted descending by score
    for (let i = 1; i < hs.length; i++) expect(hs[i - 1].score).toBeGreaterThanOrEqual(hs[i].score);
  });

  it("generates a design-accurate first-read woven with real placements", () => {
    const c = computeChart(sample);
    const r = generateFirstRead(c);
    expect(r.lead).toContain("撕掉");
    expect(r.paragraphs.length).toBe(4);
    expect(r.quote.length).toBeGreaterThan(0);
    expect(r.chips.length).toBe(3);
    expect(r.ascSign).toBe(c.ascSign);
    // weaves in the real Moon sign
    const moon = c.placements.find((p) => p.body === "Moon")!;
    expect(r.paragraphs.some((p) => p.text.includes(moon.sign))).toBe(true);
  });
});
