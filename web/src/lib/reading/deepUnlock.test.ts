import { describe, it, expect } from "vitest";
import { deepUnlock, DEEP_UNLOCK_AT } from "./deepUnlock";
import { generateThemeRead, THEME_IDS } from "./theme";
import { computeChart } from "../astro/chart";

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

describe("deepUnlock (#2 honest gating §3.6)", () => {
  it("locked below the threshold, unlocked at/above it", () => {
    expect(deepUnlock(62).unlocked).toBe(false);
    expect(deepUnlock(DEEP_UNLOCK_AT - 1).unlocked).toBe(false);
    expect(deepUnlock(DEEP_UNLOCK_AT).unlocked).toBe(true);
    expect(deepUnlock(95).unlocked).toBe(true);
  });
  it("the threshold is reachable by EVERY user incl. unknown-birth-time (§4.5 no empty promise)", () => {
    // unknown-time 懂你度 ceiling ≈ 78 (base 50 + hits 10 + checkins 8 + days 10);
    // the free unlock must sit at/below it or it's a broken promise.
    expect(DEEP_UNLOCK_AT).toBeLessThanOrEqual(78);
  });
  it("reports how much 懂你度 is still needed (the 越用越准 path)", () => {
    expect(deepUnlock(62).toGo).toBe(10);
    expect(deepUnlock(DEEP_UNLOCK_AT).toGo).toBe(0);
  });
});

describe("deepRead is REAL content (§4.5 not an empty promise)", () => {
  it("every theme ships a substantial deep paragraph", () => {
    for (const id of THEME_IDS) {
      const r = generateThemeRead(A, id);
      expect(r.deepRead.length, `deepRead too thin for ${id}`).toBeGreaterThan(40);
    }
  });
  it("STRONG: it's chart-anchored — distinct themes differ, and so do distinct charts", () => {
    const themes = THEME_IDS.map((id) => generateThemeRead(A, id).deepRead);
    expect(new Set(themes).size).toBe(THEME_IDS.length);
    const differ = THEME_IDS.some((id) => generateThemeRead(A, id).deepRead !== generateThemeRead(B, id).deepRead);
    expect(differ).toBe(true);
  });
});
