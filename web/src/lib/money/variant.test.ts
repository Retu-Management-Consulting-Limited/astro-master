import { describe, it, expect } from "vitest";
import { assignVariant } from "./variant";

describe("H3 variant assignment", () => {
  it("is stable per user id", () => {
    expect(assignVariant("abc")).toBe(assignVariant("abc"));
  });
  it("returns one of the two arms", () => {
    expect(["personalized", "barnum"]).toContain(assignVariant("xyz"));
  });
  it("splits roughly toward personalized across many ids", () => {
    let p = 0;
    for (let i = 0; i < 1000; i++) if (assignVariant("user" + i) === "personalized") p++;
    expect(p).toBeGreaterThan(650); // ~80% personalized
    expect(p).toBeLessThan(900);
  });
});
