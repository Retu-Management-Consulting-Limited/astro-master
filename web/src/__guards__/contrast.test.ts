import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { contrastRatio } from "../lib/contrast";

// CON-1: muted body/label text must clear WCAG AA 4.5:1 on the surfaces it sits on.
// Reads the real tokens from globals.css so a regression to a too-dark value fails.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const tok = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};

describe("color contrast (CON-1, WCAG AA)", () => {
  it("--mute clears 4.5:1 on both --field (cards) and --void (bg)", () => {
    const mute = tok("mute"), field = tok("field"), voidc = tok("void");
    expect(contrastRatio(mute, field)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(mute, voidc)).toBeGreaterThanOrEqual(4.5);
  });
  it("--cream-dim (running body) clears 4.5:1 on --field", () => {
    expect(contrastRatio(tok("cream-dim"), tok("field"))).toBeGreaterThanOrEqual(4.5);
  });
  it("contrastRatio sanity: white/black = 21, identical = 1", () => {
    expect(Math.round(contrastRatio("#ffffff", "#000000"))).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
  });
});
