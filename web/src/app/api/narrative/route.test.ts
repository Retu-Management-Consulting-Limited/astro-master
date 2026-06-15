import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock the LLM runner so tests never hit the real API/SDK (fast + deterministic).
// A rejecting runLLM exercises the route's deterministic-skeleton fallback path.
vi.mock("@/lib/ai/llm", () => ({ runLLM: vi.fn().mockRejectedValue(new Error("ai off in test")) }));

import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { POST } from "./route";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

beforeAll(() => {
  process.env.RL_DISABLED = "1"; // no rate-limit noise in tests
});

function req(body: unknown) {
  return new Request("http://localhost/api/narrative", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/narrative", () => {
  it("400 on missing chart", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns a chapter with guardrail-clean prose (AI off → deterministic skeleton)", async () => {
    const res = await POST(req({ chart, userId: "t1", date: "2026-06-13" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.hopeNote).toBe("string");
    expect(json.prophecy && typeof json.prophecy.text).toBe("string");
    expect(json.meaning).toBeTruthy();
    expect(json.page).toBeGreaterThanOrEqual(1);
    expect(json.source).toBe("deterministic");
  });

  it("second call same day is served from cache (page number stable)", async () => {
    const a = await (await POST(req({ chart, userId: "t2", date: "2026-06-13" }))).json();
    const b = await (await POST(req({ chart, userId: "t2", date: "2026-06-13" }))).json();
    expect(b.page).toBe(a.page);
  });

  it("accepts a barnum variant for the H3 A/B test", async () => {
    const res = await POST(req({ chart, userId: "t3", date: "2026-06-13", variant: "barnum" }));
    const json = await res.json();
    expect(json.variant).toBe("barnum");
  });
});
