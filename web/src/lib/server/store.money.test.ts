import { describe, it, expect } from "vitest";
import { narrativeDayGet, narrativeDaySet, pushChapterLog, getChapterLog } from "./store";

describe("money KV helpers (memory fallback)", () => {
  it("day cache round-trips", async () => {
    await narrativeDaySet("u1", "2026-06-14", "p", { hopeNote: "hi" });
    expect(await narrativeDayGet("u1", "2026-06-14", "p")).toEqual({ hopeNote: "hi" });
    expect(await narrativeDayGet("u1", "2026-06-15", "p")).toBeNull();
  });
  it("chapter log keeps most-recent-first, bounded read", async () => {
    await pushChapterLog("u2", { themeKey: "a" });
    await pushChapterLog("u2", { themeKey: "b" });
    const log = await getChapterLog("u2", 14);
    expect((log[0] as { themeKey: string }).themeKey).toBe("b");
  });
});
