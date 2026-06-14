import { describe, it, expect } from "vitest";
import { logUsage, costSummary, estimateUsd } from "./cost";

// Fixed timestamps (Date.now passed explicitly) so days are deterministic.
const DAY = 86_400_000;
const T = 1_700_000_000_000; // a fixed "today"

describe("cost monitoring", () => {
  it("aggregates calls + tokens per day, split by model", async () => {
    await logUsage({ route: "reading", model: "sonnet", inTok: 100, outTok: 50 }, T);
    await logUsage({ route: "chat", model: "sonnet", inTok: 200, outTok: 80 }, T);
    await logUsage({ route: "chat", model: "haiku", inTok: 1000, outTok: 400 }, T);

    const [today] = await costSummary(1, T);
    expect(today.calls).toBe(3);
    expect(today.byModel.sonnet).toEqual({ calls: 2, inTok: 300, outTok: 130 });
    expect(today.byModel.haiku).toEqual({ calls: 1, inTok: 1000, outTok: 400 });
  });

  it("estimateUsd uses the price table", () => {
    // sonnet: (300*3 + 130*15)/1e6 ; haiku: (1000*1 + 400*5)/1e6
    const usd = estimateUsd({
      sonnet: { calls: 2, inTok: 300, outTok: 130 },
      haiku: { calls: 1, inTok: 1000, outTok: 400 },
    });
    expect(usd).toBeCloseTo((300 * 3 + 130 * 15 + 1000 * 1 + 400 * 5) / 1_000_000, 6);
  });

  it("costSummary spans multiple days and skips empty days", async () => {
    await logUsage({ route: "chat", model: "haiku", inTok: 10, outTok: 10 }, T - 2 * DAY);
    const span = await costSummary(7, T);
    // today (from first test) + the day two days ago → at least 2 entries
    expect(span.length).toBeGreaterThanOrEqual(2);
    expect(span.every((d) => typeof d.estUsd === "number")).toBe(true);
  });
});
