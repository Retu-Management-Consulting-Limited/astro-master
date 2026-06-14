import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Tripwire for the hydration-race bug class (P1-1, root cause G1). The correct
// chart-gating pattern is useChartGuard() (src/lib/guard.ts), which waits for the
// persisted store to rehydrate before redirecting. A page that instead reads the
// store and calls router.replace("/input") directly will bounce a refreshing user
// to /input on the first client frame. This keeps that pattern from coming back:
// any page that redirects to /input MUST do it through useChartGuard.

const APP = join(process.cwd(), "src/app");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith("page.tsx")) out.push(p);
  }
  return out;
}

const pages = walk(APP);
const read = (f: string) => readFileSync(f, "utf8");

describe("chart gating (P1-1 / G1 tripwire)", () => {
  it("no page redirects to /input without going through useChartGuard", () => {
    const offenders = pages.filter((f) => {
      const src = read(f);
      const redirectsToInput = /\.replace\(\s*["'`]\/input["'`]\s*\)/.test(src);
      const usesGuard = /useChartGuard/.test(src);
      return redirectsToInput && !usesGuard;
    });
    expect(offenders, `manual /input redirect without useChartGuard in:\n${offenders.join("\n")}`).toEqual([]);
  });
});
