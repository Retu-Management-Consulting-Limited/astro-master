import { describe, it, expect } from "vitest";
import { initBelief, refineMeaning, beliefToMeaning } from "./behavior";
import type { MoneyPersona } from "./types";

const persona: MoneyPersona = {
  meaning: { primary: "freedom", secondary: "security", relation: "tension" },
  precision: "exact",
  scores: { security: 4, status: 1, freedom: 6, worth: 2, control: 1, care: 0 },
  strengths: ["敢出手"],
  blindSpot: "x",
  styleTag: "冲动扩张型",
};

describe("behavior learning", () => {
  it("seeds belief from the persona's chart scores", () => {
    const b = initBelief(persona);
    expect(b.scores.freedom).toBeGreaterThan(b.scores.care);
    expect(b.confidence).toBeGreaterThanOrEqual(0);
    expect(b.confidence).toBeLessThanOrEqual(1);
  });

  it("an explicit correction is a strong signal that can flip primary", () => {
    let b = initBelief(persona);
    for (let i = 0; i < 5; i++) b = refineMeaning(b, { kind: "correct", meaning: "security", weight: 1 });
    expect(beliefToMeaning(b).primary).toBe("security");
  });

  it("implicit engagement nudges but does not instantly flip", () => {
    const b0 = initBelief(persona);
    const b1 = refineMeaning(b0, { kind: "engage", meaning: "security", weight: 1 });
    expect(b1.scores.security).toBeGreaterThan(b0.scores.security);
    expect(beliefToMeaning(b1).primary).toBe("freedom"); // one nudge doesn't flip
  });

  it("confidence rises as signals accumulate", () => {
    let b = initBelief(persona);
    const c0 = b.confidence;
    for (let i = 0; i < 8; i++) b = refineMeaning(b, { kind: "engage", meaning: "freedom", weight: 1 });
    expect(b.confidence).toBeGreaterThan(c0);
  });
});
