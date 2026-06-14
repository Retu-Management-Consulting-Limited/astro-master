import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/ai/llm", () => ({ runLLM: vi.fn() }));
import { runLLM } from "@/lib/ai/llm";
import { POST } from "./route";
import { computeChart, type BirthInput } from "@/lib/astro/chart";

const chartFrom = (b: Partial<BirthInput>) =>
  computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.81, lng: 144.96, tz: 10, ...b });
// Distinct birth dates → distinct chart signatures → distinct cache keys
// (a 1-minute delta rounds to the SAME signature and would be a cache hit).
const distinctChart = (i: number) => computeChart({ year: 1990 + i, month: 1 + (i % 12), day: 10, hour: 6, minute: 0, lat: 22.3, lng: 114.2, tz: 8 });

const post = (body: unknown, mid = `m-${Math.random()}`) =>
  POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", cookie: `mid=${mid}` }, body: JSON.stringify(body) }));

const validFirstRead = JSON.stringify({ lead: "看穿你", paragraphs: [{ text: "一段" }], quote: "金句", chips: ["q1"] });

beforeEach(() => vi.mocked(runLLM).mockReset());
afterEach(() => {
  delete process.env.RL_READ_DAY;
});

describe("reading route — graceful fallback (never 500)", () => {
  it("first-read AI failure → deterministic stub with fallback flag", async () => {
    vi.mocked(runLLM).mockResolvedValue({} as never); // failed/bad response → caught → stub
    const res = await post({ chart: chartFrom({}) });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.fallback).toBe(true);
    expect(j.ascSign).toBeTruthy(); // real deterministic reading shape
    expect(Array.isArray(j.paragraphs)).toBe(true);
  });

  it("theme AI failure → deterministic theme scaffold", async () => {
    vi.mocked(runLLM).mockResolvedValue({} as never); // failed/bad response → caught → scaffold
    const j = await (await post({ kind: "theme", themeId: "love", chart: chartFrom({}) })).json();
    expect(j.fallback).toBe(true);
    expect(j.title).toBeTruthy();
    expect(j.paragraphs.length).toBeGreaterThan(0);
  });
});

describe("reading route — success + cost", () => {
  it("returns AI prose and logs usage when provided", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: validFirstRead, usage: { model: "haiku", inTok: 50, outTok: 20 } });
    const j = await (await post({ chart: chartFrom({ minute: 41 }) })).json();
    expect(j.lead).toBe("看穿你");
    expect(j.fallback).toBeUndefined();
  });
});

describe("reading route — rate limit serves stub (never blocks the funnel)", () => {
  it("past the daily limit returns the deterministic stub, no extra AI call", async () => {
    process.env.RL_READ_DAY = "1";
    vi.mocked(runLLM).mockResolvedValue({ text: validFirstRead });
    const mid = `rl-read-${Date.now()}`;
    // 1st (distinct chart → no cache) consumes the single allowance
    const r1 = await post({ chart: distinctChart(3) }, mid);
    expect((await r1.json()).limited).toBeUndefined();
    // 2nd DIFFERENT chart (distinct signature → cache miss), same identity →
    // limited → stub, LLM not called again
    const r2 = await post({ chart: distinctChart(7) }, mid);
    expect(r2.status).toBe(200);
    expect((await r2.json()).limited).toBe(true);
    expect(runLLM).toHaveBeenCalledTimes(1);
  });
});
