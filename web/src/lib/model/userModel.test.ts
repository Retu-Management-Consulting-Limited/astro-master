import { describe, it, expect } from "vitest";
import { buildUserModel, moodTrend, lowStreak, dominantMood, type UserSignals } from "./userModel";
import type { DayMood } from "../moodHistory";

// build DayMood[] quickly: each tuple [dayKey, avg, ...moods]
const day = (dayKey: string, avg: number, moods: string[] = []): DayMood => ({
  dayKey,
  avg,
  entries: moods.map((mood, i) => ({ mood, ts: i })),
});

const base: UserSignals = {
  exactTime: true, calibrated: true, hasFirstRead: true, hasNickname: true,
  daysKnown: 3, hits: 0, misses: 0, checkins: 3, moodDays: [],
};

describe("userModel · mood trend", () => {
  it("flat with <2 days", () => {
    expect(moodTrend([])).toBe("flat");
    expect(moodTrend([day("d1", -2)])).toBe("flat");
  });
  it("down when recent days drop vs earlier", () => {
    const days = [day("d1", 2), day("d2", 2), day("d3", 1), day("d4", -1), day("d5", -2), day("d6", -2)];
    expect(moodTrend(days)).toBe("down");
  });
  it("up when recent days climb vs earlier", () => {
    const days = [day("d1", -2), day("d2", -2), day("d3", -1), day("d4", 1), day("d5", 2), day("d6", 2)];
    expect(moodTrend(days)).toBe("up");
  });
});

describe("userModel · low streak + dominant", () => {
  it("counts only the most-recent consecutive negative days", () => {
    expect(lowStreak([day("d1", -1), day("d2", 1), day("d3", -1), day("d4", -2)])).toBe(2);
    expect(lowStreak([day("d1", -1), day("d2", 1)])).toBe(0); // last day positive
  });
  it("dominant = most-logged mood across days", () => {
    const days = [day("d1", 0, ["平静", "低落"]), day("d2", -1, ["低落"])];
    expect(dominantMood(days)).toBe("低落");
    expect(dominantMood([])).toBeNull();
  });
});

describe("userModel · build", () => {
  it("folds signals into understanding + trust + mood", () => {
    const m = buildUserModel({ ...base, hits: 3, misses: 0, moodDays: [day("d1", -1), day("d2", -2)] });
    expect(m.trust).toEqual({ hits: 3, misses: 0, hitRate: 1 });
    expect(m.mood.lowStreak).toBe(2);
    expect(m.understanding).toBeGreaterThan(0);
  });
  it("STRONG: being wrong lowers the model's understanding (keystone closes the honest loop)", () => {
    const right = buildUserModel({ ...base, hits: 4, misses: 0 });
    const wrong = buildUserModel({ ...base, hits: 4, misses: 4 });
    expect(wrong.understanding).toBeLessThan(right.understanding);
    expect(wrong.trust.hitRate).toBeLessThan(right.trust.hitRate);
  });
});
