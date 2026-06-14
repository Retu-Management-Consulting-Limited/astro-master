import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/llm", () => ({ runLLM: vi.fn() }));
import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", cookie: "mid=v1" }, body: JSON.stringify(body) }));

// P1-4 / R11: structurally-incomplete charts must fail fast with a 4xx, never
// reach generateFirstRead (which dereferences Sun/Moon) and 500.
describe("reading route — fail-fast chart validation", () => {
  it("empty placements → 400 (not 500)", async () => {
    const res = await post({ chart: { ascSign: "天蝎", placements: [], aspects: [] } });
    expect(res.status).toBe(400);
  });

  it("chart missing the Moon → 400 (not 500)", async () => {
    const res = await post({ chart: { ascSign: "天蝎", placements: [{ body: "Sun", sign: "狮子", house: 5 }], aspects: [] } });
    expect(res.status).toBe(400);
  });

  it("chart with no aspects array → 400 (not 500)", async () => {
    const res = await post({ chart: { ascSign: "天蝎", placements: [{ body: "Sun", sign: "狮子", house: 5 }, { body: "Moon", sign: "双子", house: 3 }] } });
    expect(res.status).toBe(400);
  });
});
