import { describe, it, expect } from "vitest";
import type { BirthInput } from "../astro/chart";
import { seed } from "../astro/timeBelief";
import type { LifeEvent } from "../astro/rectify";
import {
  isAngleRelated,
  confirmVerdict,
  halfFilledEvents,
  shouldBaitForCompletion,
  completeEvent,
} from "./calibrationSignal";
import { validateMoneyCopy } from "../money/guardrail";

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const move: LifeEvent = { kind: "move", year: 2019, month: 3 };

describe("Phase 6B — 四角相关确认加权 (angle-related confirm only)", () => {
  it("ASC/MC targets are angle-related; planets are not", () => {
    expect(isAngleRelated("ASC")).toBe(true);
    expect(isAngleRelated("MC")).toBe(true);
    expect(isAngleRelated("Sun")).toBe(false);
    expect(isAngleRelated("Moon")).toBe(false);
    expect(isAngleRelated("Saturn")).toBe(false);
  });

  it("confirming an ANGLE-related verdict ticks confidence up", () => {
    const before = seed(birth, [move]);
    const after = confirmVerdict(before, "ASC");
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });

  it("confirming a PURE-PLANET verdict does NOT move the belief (only 四角相关的才喂时辰)", () => {
    const before = seed(birth, [move]);
    const after = confirmVerdict(before, "Mars");
    expect(after).toEqual(before);
    expect(after.confidence).toBe(before.confidence);
  });

  it("MC confirm also feeds (the other angle)", () => {
    const before = seed(birth, [move]);
    const after = confirmVerdict(before, "MC");
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });
});

describe("Phase 6A — 平淡日备战糖收料 (partial-event drip)", () => {
  const halfMove: LifeEvent = { kind: "move", year: 2019 }; // year only, no month
  const fullCareer: LifeEvent = { kind: "career", year: 2021, month: 9 };

  it("halfFilledEvents finds events missing a month", () => {
    expect(halfFilledEvents([halfMove, fullCareer])).toEqual([halfMove]);
    expect(halfFilledEvents([fullCareer])).toEqual([]);
  });

  it("bait shows only when belief is still wide AND a half-filled event exists", () => {
    const wide = seed(birth, [halfMove]); // few events → wide
    expect(shouldBaitForCompletion(wide, [halfMove, fullCareer])).toBe(true);
    // no half-filled event → nothing to drip
    expect(shouldBaitForCompletion(wide, [fullCareer])).toBe(false);
  });

  it("completing a half-filled event re-rectifies on the new month (refine event)", () => {
    // partial reads the move at a mid-year stand-in; completing it to a real
    // month must move the inferred hour distribution — partial ≠ completed.
    const partial = seed(birth, [halfMove, fullCareer]);
    const completed = completeEvent([halfMove, fullCareer], halfMove, 3); // 那次搬家是 3 月
    const after = completed.belief(birth);
    // the completed event list no longer has a half-filled move
    expect(halfFilledEvents(completed.events)).toEqual([]);
    // the half-filled event has its remembered month written in
    expect(completed.events.find((e) => e.kind === "move")?.month).toBe(3);
    // and the belief genuinely responds to the new evidence (real narrowing,
    // not a no-op): the hour distribution shifts versus the stand-in read.
    expect(after.buckets).not.toEqual(partial.buckets);
  });

  it("the bait copy names the actual event and never claims certainty", () => {
    const bait = completeEvent([halfMove], halfMove, 3);
    expect(bait.prompt).toContain("搬");        // names the move
    expect(bait.prompt).toMatch(/哪个月|几月|月份/); // asks for the missing month
    expect(bait.prompt).not.toMatch(/一定|肯定|保证/); // no false certainty
  });

  it("the bait copy passes the money/guardrail (no amount/shame/gamble)", () => {
    for (const kind of ["move", "career", "relationship", "health", "family"] as const) {
      const ev: LifeEvent = { kind, year: 2019 };
      const bait = completeEvent([ev], ev, 3);
      expect(validateMoneyCopy(bait.prompt).ok).toBe(true);
    }
  });
});
