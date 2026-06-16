import { describe, it, expect } from "vitest";
import { chatOpeners, topDomain, OPENERS_BY_DOMAIN } from "./openers";
import { computeChart } from "../astro/chart";
import type { Domain } from "../astro/highlights";

const DOMAINS = Object.keys(OPENERS_BY_DOMAIN) as Domain[];
// two deliberately different charts
const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

describe("openers · personalization (#3, constitution §3.1 anti-Barnum)", () => {
  it("prefers the user's own first-read chips (most personalized)", () => {
    expect(chatOpeners(A, ["甲", "乙", "丙"])).toEqual(["甲", "乙", "丙"]);
    expect(chatOpeners(A, ["只有一个"])).not.toEqual(["只有一个"]); // <2 → fall through to chart
  });

  it("STRONG: every domain has a DISTINCT opener set (no one-size-fits-all line)", () => {
    const firsts = DOMAINS.map((d) => OPENERS_BY_DOMAIN[d][0]);
    expect(new Set(firsts).size).toBe(DOMAINS.length);
  });

  it("falls back to the chart's strongest domain, not a fixed generic list", () => {
    const oa = chatOpeners(A);
    expect(oa).toEqual(OPENERS_BY_DOMAIN[topDomain(A)]);
    expect(oa).toHaveLength(3);
    // the old generic openers must NOT be what we serve
    expect(oa).not.toContain("我最近有点焦虑");
  });

  it("§6.5: triggers are curiosity/self-identity — NEVER fear", () => {
    for (const d of DOMAINS) {
      for (const q of OPENERS_BY_DOMAIN[d]) {
        expect(q, `fear-coded opener: ${q}`).not.toMatch(/错过|厄运|小心|危险|警告|不看就|否则/);
      }
    }
  });
});
