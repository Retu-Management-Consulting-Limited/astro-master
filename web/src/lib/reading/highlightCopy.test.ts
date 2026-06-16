import { describe, it, expect } from "vitest";
import { highlightHeadline, highlightHook, highlightTheme } from "./highlightCopy";
import type { Domain } from "../astro/highlights";
import { THEME_IDS } from "./theme";

const DOMAINS: Domain[] = ["love", "career", "self", "mind", "lonely", "shadow"];

describe("highlight copy (#1)", () => {
  it("every domain has a non-trivial emotional headline", () => {
    for (const d of DOMAINS) expect(highlightHeadline(d).length).toBeGreaterThan(8);
  });

  it("STRONG: distinct domains give distinct headlines (not one Barnum line for all)", () => {
    const seen = DOMAINS.map(highlightHeadline);
    expect(new Set(seen).size).toBe(DOMAINS.length);
  });

  it("the headline is recognition, the hook is an invitation (R18③ — never 'I expose you')", () => {
    for (const d of DOMAINS) {
      const hook = highlightHook(d);
      expect(hook.length).toBeGreaterThan(2);
      expect(hook).not.toMatch(/看穿|揭穿|拆穿/); // ally, not judge
    }
  });

  it("every highlight maps to a real theme deep-read", () => {
    for (const d of DOMAINS) expect(THEME_IDS).toContain(highlightTheme(d));
  });
});
