import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/llm", () => ({ runLLM: vi.fn() }));
import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", cookie: "mid=vc1" }, body: JSON.stringify(body) }));

const msgs = [{ from: "me", text: "hi" }];

// P1-4 / R11: same fail-fast contract for the chat route.
describe("chat route — fail-fast chart validation", () => {
  it("empty placements → 400 (not 500)", async () => {
    const res = await post({ chart: { ascSign: "天蝎", placements: [], aspects: [] }, messages: msgs });
    expect(res.status).toBe(400);
  });

  it("chart missing the Moon → 400 (not 500)", async () => {
    const res = await post({ chart: { ascSign: "天蝎", placements: [{ body: "Sun", sign: "狮子", house: 5 }], aspects: [] }, messages: msgs });
    expect(res.status).toBe(400);
  });
});
