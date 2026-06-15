import { describe, it, expect } from "vitest";
import { parseMoodLog, appendMood, moodLogKey, fmtTime } from "./mood";

describe("mood log (multi-time-per-day)", () => {
  it("appends — keeps EVERY check-in across the day, not just the last", () => {
    let log = appendMood([], "平静", 1000);
    log = appendMood(log, "有劲", 2_000_000);   // hours later, different mood
    log = appendMood(log, "低落", 4_000_000);
    expect(log.map((e) => e.mood)).toEqual(["平静", "有劲", "低落"]);
    expect(log).toHaveLength(3);
  });

  it("ignores an accidental identical double-tap within 60s", () => {
    let log = appendMood([], "平静", 1_000_000);
    log = appendMood(log, "平静", 1_000_000 + 30_000); // same mood, 30s later → no-op
    expect(log).toHaveLength(1);
  });

  it("allows the SAME mood again later in the day (>60s apart)", () => {
    let log = appendMood([], "平静", 1_000_000);
    log = appendMood(log, "平静", 1_000_000 + 5 * 3600_000); // 5h later → a real new check-in
    expect(log).toHaveLength(2);
  });

  it("caps at 12 entries (keeps the most recent)", () => {
    let log: ReturnType<typeof appendMood> = [];
    for (let i = 0; i < 20; i++) log = appendMood(log, `m${i}`, i * 120_000);
    expect(log).toHaveLength(12);
    expect(log[log.length - 1].mood).toBe("m19");
  });

  it("parses missing/garbage as empty", () => {
    expect(parseMoodLog(null)).toEqual([]);
    expect(parseMoodLog("not json")).toEqual([]);
    expect(parseMoodLog('{"x":1}')).toEqual([]);
    expect(parseMoodLog('[{"mood":"平静","ts":5},{"bad":1}]')).toEqual([{ mood: "平静", ts: 5 }]);
  });

  it("key is per-day; fmtTime is HH:MM", () => {
    expect(moodLogKey("2026-06-15")).toBe("molly_moodlog_2026-06-15");
    expect(fmtTime(Date.UTC(2026, 5, 15, 9, 5))).toMatch(/^\d{2}:\d{2}$/);
  });
});
