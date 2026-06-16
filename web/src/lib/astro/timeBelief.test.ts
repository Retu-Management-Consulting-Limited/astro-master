import { describe, it, expect } from "vitest";
import type { BirthInput } from "./chart";
import type { LifeEvent } from "./rectify";
import { seed, refine } from "./timeBelief";

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const move: LifeEvent = { kind: "move", year: 2019, month: 3 };
const career: LifeEvent = { kind: "career", year: 2021, month: 9 };

describe("timeBelief — seed + refine", () => {
  it("seed(birth, []) is the flat planet-mode prior", () => {
    const b = seed(birth, []);
    expect(b.mode).toBe("planet");
    expect(b.confidence).toBeCloseTo(0, 6);
  });

  it("seed(birth, events) equals rectify over those events", () => {
    const a = seed(birth, [move, career]);
    const b = seed(birth, [move, career]);
    expect(a).toEqual(b);
    expect(a.confidence).toBeGreaterThan(0);
  });

  it("event signal re-rectifies and narrows the most", () => {
    const before = seed(birth, [move]);
    const after = refine(before, { type: "event", birth, events: [move, career] });
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });

  it("confirm signal nudges confidence up but never flips the whole belief", () => {
    const before = seed(birth, [move]);
    const after = refine(before, { type: "confirm" });
    expect(after.confidence).toBeGreaterThan(before.confidence);
    // a single confirm is a small nudge, not a re-rectification: the topRange
    // (which hour band she's locked to) is unchanged by one confirm.
    expect(after.topRange).toEqual(before.topRange);
    // and it must move less than a real event would
    const eventAfter = refine(before, { type: "event", birth, events: [move, career] });
    expect(after.confidence - before.confidence).toBeLessThan(eventAfter.confidence - before.confidence);
  });

  it("traitPick is a weak starter — moves confidence only a hair", () => {
    const before = seed(birth, []); // confidence 0
    const after = refine(before, { type: "traitPick" });
    expect(after.confidence).toBeGreaterThan(before.confidence);
    expect(after.confidence).toBeLessThan(0.1);
  });

  it("refine never pushes confidence to 1 (no god-view), even repeated", () => {
    let b = seed(birth, [move, career]);
    for (let i = 0; i < 200; i++) b = refine(b, { type: "confirm" });
    expect(b.confidence).toBeLessThan(1);
  });
});
