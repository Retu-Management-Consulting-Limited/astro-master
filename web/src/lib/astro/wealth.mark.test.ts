import { describe, it, expect } from "vitest";
import { wealthMark, type WealthLevel } from "./wealth";

describe("wealthMark (color-blind non-color cue)", () => {
  it("gives 旺/慎 distinct shape glyphs (not color)", () => {
    expect(wealthMark("wang").glyph).toBe("▲");
    expect(wealthMark("shen").glyph).toBe("▼");
    // the two actionable extremes must differ by shape, so red/green is not the only channel
    expect(wealthMark("wang").glyph).not.toBe(wealthMark("shen").glyph);
  });

  it("labels every level for aria", () => {
    const levels: WealthLevel[] = ["wang", "ping", "shen"];
    for (const l of levels) {
      expect(wealthMark(l).label).toMatch(/^财运(旺|平|慎)$/);
    }
  });

  it("neutral day is marked '·'", () => {
    expect(wealthMark("ping")).toEqual({ glyph: "·", label: "财运平" });
  });
});
