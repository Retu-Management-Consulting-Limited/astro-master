import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the LLM: unit tests must never spawn the real model. We drive runLLM's
// return to exercise the route's parse / cache / fallback branches.
vi.mock("@/lib/ai/llm", () => ({
  runLLM: vi.fn(),
  AI_BACKEND: "api",
}));

import { runLLM } from "@/lib/ai/llm";
import { computeChart } from "@/lib/astro/chart";
import { POST } from "./route";

// Real, complete charts (all bodies present) — synastry() asserts every body it pairs.
const chartA = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const chartB = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

const jpost = (body: unknown) =>
  POST(new Request("http://x/api/synastry/reading", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.mocked(runLLM).mockReset();
});

describe("synastry reading route (Unit B)", () => {
  it("LLM success → returns vibe/body/catchLine", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: JSON.stringify({ vibe: "心动够烈，但安全感暗礁", body: "你的火星撞她的金星…", catchLine: "你俩都太硬。" }) });
    const r = await jpost({ selfChart: chartA, otherChart: chartB, type: "lover", otherName: "小鱼" });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.vibe).toBe("心动够烈，但安全感暗礁");
    expect(j.catchLine).toBe("你俩都太硬。");
  });

  it("LLM failure → graceful per-type scaffold fallback, not 500", async () => {
    vi.mocked(runLLM).mockRejectedValue(new Error("model down"));
    const r = await jpost({ selfChart: chartA, otherChart: chartB, type: "colleague", otherName: "Leo" });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.fallback).toBe(true);
    expect(j.catchLine).toContain("能力"); // colleague scaffold signature — proves per-type fallback
  });

  it("malformed LLM JSON → graceful scaffold fallback", async () => {
    // distinct type → distinct cache key, so this isn't served by an earlier test's cache
    vi.mocked(runLLM).mockResolvedValue({ text: "not json at all" });
    const r = await jpost({ selfChart: chartA, otherChart: chartB, type: "friend", otherName: "小鱼" });
    const j = await r.json();
    expect(j.fallback).toBe(true);
    expect(typeof j.catchLine).toBe("string");
  });

  it("caches by (type, charts): a second identical call does not re-invoke the LLM", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: JSON.stringify({ vibe: "v", body: "b", catchLine: "c" }) });
    await jpost({ selfChart: chartA, otherChart: chartB, type: "family", otherName: "妈妈" });
    await jpost({ selfChart: chartA, otherChart: chartB, type: "family", otherName: "妈妈" });
    expect(vi.mocked(runLLM)).toHaveBeenCalledTimes(1);
  });

  it("invalid chart → 400 (never reaches the model)", async () => {
    const r = await jpost({ selfChart: {}, otherChart: chartB, type: "lover" });
    expect(r.status).toBe(400);
    expect(vi.mocked(runLLM)).not.toHaveBeenCalled();
  });

  it("bad relationship type → 400", async () => {
    const r = await jpost({ selfChart: chartA, otherChart: chartB, type: "enemy" });
    expect(r.status).toBe(400);
  });
});
