import { describe, it, expect, vi } from "vitest";
import * as base from "@/lib/track";
import { trackNarrativeView, trackDwell, trackMeaningCorrected, trackAccuracy } from "./track";

describe("money telemetry", () => {
  it("forwards typed events to base track()", () => {
    const spy = vi.spyOn(base, "track").mockImplementation(() => {});
    trackNarrativeView({ page: 3, variant: "personalized", weight: "heavy" });
    trackDwell({ page: 3, ms: 4200 });
    trackMeaningCorrected({ from: "freedom", to: "security" });
    trackAccuracy({ rating: "good", variant: "personalized" });
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls[0][0]).toBe("money_narrative_view");
    spy.mockRestore();
  });
});
