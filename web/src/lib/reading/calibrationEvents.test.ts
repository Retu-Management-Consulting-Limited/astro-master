import { describe, it, expect } from "vitest";
import {
  EVENT_OPTIONS,
  AGE_MIN,
  AGE_MAX,
  eventsFromSelections,
  type EventSelection,
} from "./calibrationEvents";
import { seed } from "../astro/timeBelief";
import type { BirthInput } from "../astro/chart";

const BIRTH: BirthInput = { year: 1990, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };

describe("calibrationEvents · onboarding selections → LifeEvent[]", () => {
  it("maps each chip kind 1:1 to a LifeEvent the rectifier understands", () => {
    const kinds = EVENT_OPTIONS.map((o) => o.kind).sort();
    expect(kinds).toEqual(["career", "family", "health", "move", "relationship"]);
  });

  it("converts age → calendar year via the natal birth year, leaving month half-filled", () => {
    const sel: EventSelection[] = [
      { kind: "move", age: 24 },
      { kind: "career", age: 30 },
    ];
    const events = eventsFromSelections(BIRTH.year, sel);
    expect(events).toEqual([
      { kind: "move", year: 1990 + 24 },
      { kind: "career", year: 1990 + 30 },
    ]);
    // half-filled on purpose (Phase 6 备战糖 completes the month via refine)
    expect(events.every((e) => e.month === undefined)).toBe(true);
  });

  it("clamps the age to the slider band so a dragged-to-extreme never escapes it", () => {
    const events = eventsFromSelections(2000, [
      { kind: "move", age: AGE_MAX + 99 },
      { kind: "health", age: AGE_MIN - 99 },
    ]);
    expect(events[0].year).toBe(2000 + AGE_MAX);
    expect(events[1].year).toBe(2000 + AGE_MIN);
  });

  it("events → seed produces a NON-UNIFORM belief with confidence > 0 (the calibration payload)", () => {
    const events = eventsFromSelections(BIRTH.year, [
      { kind: "move", age: 24 },
      { kind: "career", age: 30 },
      { kind: "relationship", age: 27 },
    ]);
    const belief = seed(BIRTH, events);
    expect(belief.confidence).toBeGreaterThan(0);
    // non-uniform: at least one bucket differs from the flat 1/24 prior
    const flat = 1 / belief.buckets.length;
    expect(belief.buckets.some((b) => Math.abs(b - flat) > 1e-6)).toBe(true);
    expect(belief.buckets.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("empty selections → flat belief (no events, no claim about the hour)", () => {
    const belief = seed(BIRTH, eventsFromSelections(BIRTH.year, []));
    expect(belief.confidence).toBe(0);
    const flat = 1 / belief.buckets.length;
    expect(belief.buckets.every((b) => Math.abs(b - flat) < 1e-9)).toBe(true);
  });
});
