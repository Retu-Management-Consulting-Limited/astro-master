import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/ai/llm", () => ({ runLLM: vi.fn() }));
import { runLLM } from "@/lib/ai/llm";
import { POST } from "./route";
import { computeChart } from "@/lib/astro/chart";

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.81, lng: 144.96, tz: 10 });

const post = (body: unknown, mid = `m-${Math.random()}`) =>
  POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", cookie: `mid=${mid}` }, body: JSON.stringify(body) }));

const msg = (text: string) => ({ chart, messages: [{ from: "me", text }] });

beforeEach(() => vi.mocked(runLLM).mockReset());
afterEach(() => {
  delete process.env.RL_CHAT_HOUR;
  delete process.env.RL_CHAT_DAY;
});

describe("chat route — crisis short-circuit", () => {
  it("self-harm message returns care + resources WITHOUT calling the LLM", async () => {
    const res = await post(msg("我最近真的不想活了"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.crisis).toBe(true);
    expect(j.text).toContain("010-82951332");
    expect(runLLM).not.toHaveBeenCalled();
  });

  it("casual 死 usage is NOT treated as crisis (goes to the model)", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: "哈哈我懂" });
    const j = await (await post(msg("今天累死了"))).json();
    expect(j.crisis).toBeUndefined();
    expect(runLLM).toHaveBeenCalled();
  });
});

describe("chat route — normal + fallback", () => {
  it("returns the model's reply", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: "我在听，你说。" });
    const j = await (await post(msg("今天心情不好"))).json();
    expect(j.text).toBe("我在听，你说。");
  });

  it("AI failure → graceful fallback, never 500", async () => {
    vi.mocked(runLLM).mockResolvedValue({} as never); // failed/bad response → caught → fallback
    const res = await post(msg("在吗"));
    expect(res.status).toBe(200);
    expect((await res.json()).fallback).toBe(true);
  });

  it("empty model output → fallback", async () => {
    vi.mocked(runLLM).mockResolvedValue({ text: "   " });
    expect((await (await post(msg("在吗"))).json()).fallback).toBe(true);
  });
});

describe("chat route — rate limit", () => {
  it("blocks past the hourly limit with 429 + friendly copy", async () => {
    process.env.RL_CHAT_HOUR = "1";
    vi.mocked(runLLM).mockResolvedValue({ text: "嗯" });
    const mid = `rl-${Date.now()}`;
    expect((await post(msg("一"), mid)).status).toBe(200);
    const blocked = await post(msg("二"), mid);
    expect(blocked.status).toBe(429);
    const j = await blocked.json();
    expect(j.limited).toBe(true);
    expect(j.text).toContain("明天");
  });
});
