import { describe, it, expect } from "vitest";
import { isFullChart } from "./chart-validate";

const placement = (body: string, sign = "狮子", house = 5) => ({ body, sign, signIndex: 4, house });

// A structurally-complete chart: non-empty placements incl. Sun+Moon (both
// dereferenced by generateFirstRead), an ascSign, and an aspects array (iterated
// by detectHighlights). These are exactly the shapes whose absence caused the
// /api/reading 500 (P1-4).
const fullChart = {
  placements: [placement("Sun"), placement("Moon", "双子", 3)],
  asc: 120,
  mc: 30,
  ascSign: "天蝎",
  ascSignIndex: 7,
  aspects: [],
};

describe("isFullChart", () => {
  it("accepts a structurally-complete chart", () => {
    expect(isFullChart(fullChart)).toBe(true);
  });

  it("rejects null / undefined / non-object", () => {
    expect(isFullChart(null)).toBe(false);
    expect(isFullChart(undefined)).toBe(false);
    expect(isFullChart("nope")).toBe(false);
  });

  it("rejects a chart whose placements is not an array or is empty", () => {
    expect(isFullChart({ ...fullChart, placements: undefined })).toBe(false);
    expect(isFullChart({ ...fullChart, placements: [] })).toBe(false);
  });

  it("rejects a chart missing the Moon (would throw downstream)", () => {
    expect(isFullChart({ ...fullChart, placements: [placement("Sun")] })).toBe(false);
  });

  it("rejects a chart missing the Sun", () => {
    expect(isFullChart({ ...fullChart, placements: [placement("Moon")] })).toBe(false);
  });

  it("rejects a chart without an ascSign", () => {
    expect(isFullChart({ ...fullChart, ascSign: "" })).toBe(false);
  });

  it("rejects a chart whose aspects is not an array", () => {
    expect(isFullChart({ ...fullChart, aspects: undefined })).toBe(false);
  });
});
