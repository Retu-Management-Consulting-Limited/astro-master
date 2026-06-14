import { describe, it, expect } from "vitest";
import { understanding } from "./understanding";

const base = { exactTime: false, calibrated: false, hasFirstRead: false, hasNickname: false, daysKnown: 0, confirms: 0, checkins: 0 };

describe("understanding score", () => {
  it("floors at 26 for a bare chart and caps (max reachable 90, ceiling 95)", () => {
    expect(understanding(base)).toBe(26);
    // 26 +12 +10 +6 +8 +10(confirms) +8(checkins) +10(days) = 90
    expect(understanding({ exactTime: true, calibrated: true, hasFirstRead: true, hasNickname: true, daysKnown: 9999, confirms: 999, checkins: 999 })).toBe(90);
  });

  it("is monotonic in every positive signal", () => {
    expect(understanding({ ...base, exactTime: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, calibrated: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, hasFirstRead: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, hasNickname: true })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, daysKnown: 10 })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, confirms: 1 })).toBeGreaterThan(understanding(base));
    expect(understanding({ ...base, checkins: 1 })).toBeGreaterThan(understanding(base));
  });

  it("a 说中了 confirmation moves the meter (the real +X% 校准)", () => {
    expect(understanding({ ...base, confirms: 1 })).toBe(28); // 26 + 1*2
    expect(understanding({ ...base, confirms: 3 })).toBe(32); // 26 + 6
  });

  it("rises with returning days and check-ins until it caps", () => {
    const d0 = understanding({ ...base, hasNickname: true });
    const d5 = understanding({ ...base, hasNickname: true, daysKnown: 5, checkins: 5 });
    expect(d5).toBeGreaterThan(d0);
  });

  it("a registered, calibrated, exact-time day-0 user is a believable mid score", () => {
    const v = understanding({ exactTime: true, calibrated: true, hasFirstRead: true, hasNickname: true, daysKnown: 0, confirms: 0, checkins: 0 });
    expect(v).toBe(62); // 26+12+10+6+8
  });

  it("never returns a fractional or out-of-range value", () => {
    for (const days of [0, 1, 3, 7, 24, 100]) {
      for (const confirms of [0, 2, 50]) {
        const v = understanding({ ...base, daysKnown: days, confirms });
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(26);
        expect(v).toBeLessThanOrEqual(95);
      }
    }
  });
});
