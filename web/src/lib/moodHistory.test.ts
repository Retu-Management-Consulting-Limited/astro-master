import { describe, it, expect } from "vitest";
import { collectMoodHistory, moodValence, shortDay, type DayMood } from "./moodHistory";

// Minimal Storage stand-in over a plain object.
function fakeStore(map: Record<string, string>): Pick<Storage, "length" | "key" | "getItem"> {
  const keys = Object.keys(map);
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => (k in map ? map[k] : null),
  };
}

const log = (...moods: [string, number][]) => JSON.stringify(moods.map(([mood, ts]) => ({ mood, ts })));

describe("moodHistory (cross-day curve)", () => {
  it("collects every per-day log, oldest→newest, with daily avg valence", () => {
    const days = collectMoodHistory(
      fakeStore({
        "molly_moodlog_2026-06-14": log(["低落", 1], ["低潮", 2]), // avg (-1 + -2)/2 = -1.5
        "molly_moodlog_2026-06-13": log(["有劲", 1]), // avg +2
        molly_funnel: "irrelevant",
        notif: "{}",
      }),
    );
    expect(days.map((d) => d.dayKey)).toEqual(["2026-06-13", "2026-06-14"]); // sorted
    expect(days[0].avg).toBe(2);
    expect(days[1].avg).toBe(-1.5);
    // adjacent days are genuinely different (strong assertion, not Set-size) —
    // the curve must move when the user's moods move.
    expect(days[0].avg).not.toBe(days[1].avg);
  });

  it("skips keys that aren't mood logs and days with no parseable entries", () => {
    const days = collectMoodHistory(
      fakeStore({
        "molly_moodlog_2026-06-13": "garbage",
        "molly_moodlog_2026-06-14": "[]",
        molly_verdict_2026: "hit",
      }),
    );
    expect(days).toEqual([] as DayMood[]);
  });

  it("maps each mood to its valence; unknown → 0", () => {
    expect(moodValence("有劲")).toBe(2);
    expect(moodValence("低潮")).toBe(-2);
    expect(moodValence("喘口气")).toBe(0);
    expect(moodValence("???")).toBe(0);
  });

  it("shortDay renders MM-DD", () => {
    expect(shortDay("2026-06-13")).toBe("06-13");
  });
});
