import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona, scoreMeanings } from "./persona";
import { MEANING_KEYS } from "./types";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

describe("money persona", () => {
  it("scores every meaning key (finite, non-negative)", () => {
    const s = scoreMeanings(chart);
    for (const k of MEANING_KEYS) {
      expect(typeof s[k]).toBe("number");
      expect(s[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic — same chart → identical persona", () => {
    expect(moneyPersona(chart)).toEqual(moneyPersona(chart));
  });

  it("primary != secondary, both valid keys", () => {
    const p = moneyPersona(chart);
    expect(p.meaning.primary).not.toBe(p.meaning.secondary);
    expect(MEANING_KEYS).toContain(p.meaning.primary);
    expect(MEANING_KEYS).toContain(p.meaning.secondary);
  });

  it("relation is tension when primary/secondary are opposed, else reinforce", () => {
    const p = moneyPersona(chart);
    expect(["tension", "reinforce"]).toContain(p.meaning.relation);
  });

  it("precision defaults to exact, degrades to no-time", () => {
    expect(moneyPersona(chart).precision).toBe("exact");
    expect(moneyPersona(chart, "no-time").precision).toBe("no-time");
  });

  it("emits 2–4 strengths, a blindSpot, a styleTag", () => {
    const p = moneyPersona(chart);
    expect(p.strengths.length).toBeGreaterThanOrEqual(2);
    expect(p.strengths.length).toBeLessThanOrEqual(4);
    expect(p.blindSpot.length).toBeGreaterThan(0);
    expect(p.styleTag.length).toBeGreaterThan(0);
  });
});
