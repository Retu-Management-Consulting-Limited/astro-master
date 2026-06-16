import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona } from "./persona";
import { nextChapter, seasonKeyFor } from "./narrative";
import { validateMoneyCopy } from "./guardrail";
import type { Chapter } from "./types";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);
const persona = moneyPersona(chart);

function chapterOn(d: number, last: Chapter[] = []) {
  return nextChapter(persona, chart, new Date(Date.UTC(2026, 5, d, 12, 0)), last);
}

describe("money narrative", () => {
  it("is deterministic — same inputs → identical chapter", () => {
    expect(chapterOn(13)).toEqual(chapterOn(13));
  });

  it("never emits an amount×date in hopeNote or prophecy (不报数字)", () => {
    for (let d = 1; d <= 28; d++) {
      const c = chapterOn(d);
      expect(validateMoneyCopy(c.hopeNote).ok).toBe(true);
      expect(validateMoneyCopy(c.prophecy.text).ok).toBe(true);
      // structural: Prophecy has only {text,type} — no amount/date keys
      expect(Object.keys(c.prophecy).sort()).toEqual(["text", "type"]);
    }
  });

  it("colors by meaning — facet is the persona's primary or secondary", () => {
    const c = chapterOn(13);
    expect([persona.meaning.primary, persona.meaning.secondary]).toContain(c.meaningFacet);
  });

  it("rotates angle to avoid repeating a recent themeKey", () => {
    const first = chapterOn(13);
    const second = nextChapter(persona, chart, new Date(Date.UTC(2026, 5, 13, 12, 0)), [first]);
    if (second.themeKey === first.themeKey) {
      expect(second.angle).not.toBe(first.angle);
    } else {
      expect(second.themeKey).not.toBe(first.themeKey);
    }
  });

  it("assigns a weight (heavy/light/recap) and an arc beat", () => {
    const c = chapterOn(13);
    expect(["heavy", "light", "recap"]).toContain(c.weight);
    expect(["setup", "tension", "turn", "integrate"]).toContain(c.arc.beat);
    expect(c.arc.seasonKey).toBe(seasonKeyFor(new Date(Date.UTC(2026, 5, 13, 12, 0))));
  });

  it("tone varies across a month (not all identical)", () => {
    const tones = new Set(Array.from({ length: 28 }, (_, i) => chapterOn(i + 1).tone));
    expect(tones.size).toBeGreaterThan(1);
  });
});
