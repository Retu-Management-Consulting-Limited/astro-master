import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Tripwire for the class of bug found in the 2026-06-14 full-app audit (R7-R9):
// hardcoded dates, fake personalized literals, and known mock strings shipped as
// if they were real, personalized, dated content. If any of these patterns comes
// back, CI goes red. See design/DESIGN-SYSTEM.md §13.

const APP = join(process.cwd(), "src/app");
const COMPONENTS = join(process.cwd(), "src/components");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") && !p.endsWith(".test.tsx")) out.push(p);
  }
  return out;
}

const files = [...walk(APP), ...walk(COMPONENTS)];
const read = (f: string) => readFileSync(f, "utf8");

describe("no mock content (R7-R9 tripwire)", () => {
  it("no page hardcodes a year into dayWealth/monthWealth (FROZEN-DATE)", () => {
    const bad = files.filter((f) => /(?:day|month)Wealth\(\s*chart\s*,\s*\d{4}/.test(read(f)));
    expect(bad, `frozen-date literal in: ${bad.join(", ")}`).toEqual([]);
  });

  it("no '2026-06-13'-style frozen date literal in page/component source", () => {
    const bad = files.filter((f) => /["'`]20\d{2}-\d{2}-\d{2}["'`]/.test(read(f).replace(/\/\/.*$/gm, "")));
    expect(bad, `hardcoded date string in: ${bad.join(", ")}`).toEqual([]);
  });

  it("the 懂你度/校准 meter is never a hardcoded percentage literal (FAKE-PERSONAL)", () => {
    // the meter must come from {understand}; catch the old 62%/78% literals
    const bad = files.filter((f) => /(?:懂你|校准)[^<]{0,40}>(?:\s*)(?:62|78)%/.test(read(f)) || />(?:62|78)%<\/b>/.test(read(f)));
    expect(bad, `hardcoded meter % in: ${bad.join(", ")}`).toEqual([]);
  });

  it("known fabricated strings from the audit do not reappear", () => {
    const banned = [
      "三个月前的今天", // fake「她记得」recall (CT-1)
      "一个把所有人都照顾好了，唯独忘了自己的人", // fake「我眼中的你」(ME-1)
      "12.8 万人", // fabricated social proof (K1)
      "到点我提醒你", // unbacked reminder (W-3)
    ];
    for (const phrase of banned) {
      const bad = files.filter((f) => read(f).includes(phrase));
      expect(bad, `banned mock string "${phrase}" in: ${bad.join(", ")}`).toEqual([]);
    }
  });

  it("today & wealth derive 'now' from a real, non-frozen date (useNow → new Date())", () => {
    const today = read(join(APP, "today/page.tsx"));
    const wealth = read(join(APP, "wealth/page.tsx"));
    // `new Date()` now lives in the shared useNow() hook (which also refreshes on
    // app resume so a kept-open PWA rolls over to the new local day).
    expect(today).toContain("useNow()");
    expect(wealth).toContain("useNow()");
    const useNow = read(join(process.cwd(), "src/lib/useNow.ts"));
    expect(useNow).toContain("new Date()");
  });

  // X-1 (audit-2): AI/Molly output is rendered via dangerouslySetInnerHTML — those
  // files MUST sanitize first. Trusted-HTML files (own SVG / caller-controlled props)
  // are allowlisted. A new unsanitized AI-HTML render fails this tripwire.
  it("any AI/Molly text rendered as HTML goes through sanitizeRichText", () => {
    const TRUSTED = ["share/page.tsx", "LoadingRitual.tsx"]; // own SVG / trusted prop
    const offenders = files.filter((f) => {
      const src = read(f);
      if (!src.includes("dangerouslySetInnerHTML")) return false;
      if (TRUSTED.some((t) => f.endsWith(t))) return false;
      return !src.includes("sanitizeRichText");
    });
    expect(offenders, `unsanitized dangerouslySetInnerHTML in: ${offenders.join(", ")}`).toEqual([]);
  });
});
