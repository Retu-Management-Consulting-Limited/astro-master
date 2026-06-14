import { describe, it, expect } from "vitest";
import { understanding } from "./understanding";

const base = { exactTime: false, calibrated: false, hasFirstRead: false, hasNickname: false, daysKnown: 0 };

describe("understanding score", () => {
  it("floors at 30 for a bare chart and never exceeds 92", () => {
    expect(understanding(base)).toBe(30);
    expect(understanding({ exactTime: true, calibrated: true, hasFirstRead: true, hasNickname: true, daysKnown: 9999 })).toBe(92);
  });

  it("is monotonic in every positive signal", () => {
    expect(understanding({ ...base, exactTime: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, calibrated: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, hasFirstRead: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, hasNickname: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, daysKnown: 10 })).toBeGreaterThan(understanding(base));
  });

  it("rises with returning days (honest ↑) until it caps", () => {
    const d0 = understanding({ ...base, hasNickname: true });
    const d5 = understanding({ ...base, hasNickname: true, daysKnown: 5 });
    const d30 = understanding({ ...base, hasNickname: true, daysKnown: 30 });
    expect(d5).toBeGreaterThan(d0);
    expect(d30).toBeGreaterThan(d5);
    expect(d30).toBeLessThanOrEqual(92);
  });

  it("a registered, calibrated, exact-time day-0 user is a believable mid score", () => {
    const v = understanding({ exactTime: true, calibrated: true, hasFirstRead: true, hasNickname: true, daysKnown: 0 });
    expect(v).toBe(68);
  });

  it("never returns a fractional or out-of-range value", () => {
    for (const days of [0, 1, 3, 7, 24, 100]) {
      const v = understanding({ ...base, daysKnown: days });
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(30);
      expect(v).toBeLessThanOrEqual(92);
    }
  });
});
