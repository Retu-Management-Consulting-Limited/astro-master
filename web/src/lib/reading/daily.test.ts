import { describe, it, expect } from "vitest";
import { computeChart } from "../astro/chart";
import { dailyReading, dailyAspect, dayKey, existedYesterday } from "./daily";

describe("existedYesterday (T-1: no day-1 retrospective)", () => {
  const now = new Date(2026, 5, 14, 9, 0); // 2026-06-14 09:00 local
  it("is false for a day-1 user (joined today) — never ask about a never-shown prediction", () => {
    expect(existedYesterday(new Date(2026, 5, 14, 8, 0).getTime(), now)).toBe(false);
  });
  it("is false when joinedAt is missing", () => {
    expect(existedYesterday(undefined, now)).toBe(false);
  });
  it("is true once joined on a strictly earlier calendar day", () => {
    expect(existedYesterday(new Date(2026, 5, 13, 23, 30).getTime(), now)).toBe(true);
    expect(existedYesterday(new Date(2026, 5, 1).getTime(), now)).toBe(true);
  });
});

// a real chart to transit against
const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });

describe("daily reading (real transits, not hardcoded)", () => {
  it("is deterministic: same chart+date → identical output", () => {
    const d = new Date(Date.UTC(2026, 5, 14, 12));
    expect(dailyReading(chart, d)).toEqual(dailyReading(chart, d));
  });

  it("changes across days (not a frozen literal)", () => {
    const days = Array.from({ length: 14 }, (_, i) => dailyReading(chart, new Date(Date.UTC(2026, 5, 1 + i, 12))).todayLine);
    expect(new Set(days).size).toBeGreaterThan(1); // content actually varies day to day
  });

  it("differs between two different charts on the same day (personalized)", () => {
    const other = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
    const d = new Date(Date.UTC(2026, 5, 14, 12));
    const a = dailyReading(chart, d);
    const b = dailyReading(other, d);
    // at least one of the lines should differ (different natal points get hit)
    expect(a.todayLine !== b.todayLine || a.yesterdayClaim !== b.yesterdayClaim || a.moonSign !== b.moonSign).toBe(true);
  });

  it("yesterday's claim is a non-empty, deterministic string (so 说中了吗 is reproducible)", () => {
    const d = new Date(Date.UTC(2026, 5, 14, 12));
    const c = dailyReading(chart, d).yesterdayClaim;
    expect(typeof c).toBe("string");
    expect(c.length).toBeGreaterThan(2);
    expect(dailyReading(chart, d).yesterdayClaim).toBe(c); // stable
  });

  it("always returns non-empty lines and a valid quality", () => {
    const r = dailyReading(chart, new Date(Date.UTC(2026, 0, 1, 12)));
    expect(r.todayLine.length).toBeGreaterThan(4);
    expect(r.tomorrowHook.length).toBeGreaterThan(4);
    expect(r.moonLine.length).toBeGreaterThan(4);
    expect(["harm", "tense"]).toContain(r.quality);
  });

  it("dayKey is stable yyyy-mm-dd", () => {
    expect(dayKey(new Date(2026, 5, 14))).toBe("2026-06-14");
    expect(dayKey(new Date(2026, 11, 3))).toBe("2026-12-03");
  });

  it("dailyAspect returns a valid target+quality", () => {
    const a = dailyAspect(chart, new Date(Date.UTC(2026, 5, 14, 12)));
    expect(["Sun", "Moon", "Mercury", "Venus", "Mars", "Saturn", "ASC", "MC"]).toContain(a.target);
    expect(["harm", "tense"]).toContain(a.quality);
  });
});
