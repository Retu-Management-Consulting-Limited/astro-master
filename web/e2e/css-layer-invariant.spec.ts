import { test, expect, type Page } from "@playwright/test";
import { computeChart } from "../src/lib/astro/chart";

// P2 guard — runtime proof that Tailwind utilities ACTUALLY apply in a real
// browser. This is the cause-agnostic backstop to P1 (scripts/check-css-layers.mjs):
// P1 catches the known footgun (unlayered reset) at the source; this catches the
// SYMPTOM ("a utility computed to 0/none") no matter what future cause produces
// it — a new global reset, a layer-order regression, a bad PostCSS config, etc.
//
// Incident 2026-06-16: Money Mirror shipped with px-5 → 0px, mx-auto → no
// centering, and every <button> utility (border/bg/padding) stripped, because an
// unlayered `*{}` / `button{}` reset beat `@layer utilities`. jsdom can't see
// this (no real cascade/layer engine), so the assertions MUST run in a browser.

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const SEED = JSON.stringify({ state: { chart, joinedAt: Date.UTC(2026, 0, 1), nickname: "小测" }, version: 0 });

async function prep(page: Page) {
  await page.addInitScript((seed) => localStorage.setItem("molly-funnel", seed), SEED);
}

const px = (v: string) => parseFloat(v); // "20px" -> 20

test("Tailwind spacing utilities resolve (px-5 / mx-auto) on a real money page", async ({ page }) => {
  await prep(page);
  await page.goto("/money");
  await expect(page.getByText(/钱对你/).first()).toBeVisible({ timeout: 8000 });

  // The money column is `mx-auto max-w-[400px] px-5 py-8`. px-5 must be 20px
  // (calc(var(--spacing,.25rem) * 5)); py-8 must be 32px. If a reset zeroes
  // them, content bleeds to the screen edge — exactly the shipped bug.
  const box = await page.evaluate(() => {
    const c = document.querySelector("div.mx-auto");
    if (!c) return null;
    const cs = getComputedStyle(c);
    return { padL: cs.paddingLeft, padR: cs.paddingRight, padT: cs.paddingTop };
  });
  expect(box, "expected the .mx-auto money container to exist").not.toBeNull();
  expect(px(box!.padL)).toBeGreaterThanOrEqual(16); // px-5 = 20px
  expect(px(box!.padR)).toBeGreaterThanOrEqual(16);
  expect(px(box!.padT)).toBeGreaterThanOrEqual(24); // py-8 = 32px
});

test("Tailwind button utilities resolve (the gold CTA is a styled button, not bare text)", async ({ page }) => {
  await prep(page);
  await page.goto("/money");
  const cta = page.getByRole("button", { name: /看我的金钱故事/ });
  await expect(cta).toBeVisible({ timeout: 8000 });

  // The CTA is `rounded-[40px] bg-[linear-gradient(...)] py-4 w-full`. If a
  // `button{background:none;border:none}` reset wins, the gradient + padding die
  // and it renders as plain text with no tap affordance.
  const style = await cta.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bgImage: cs.backgroundImage, padT: cs.paddingTop, radius: cs.borderTopLeftRadius, h: el.getBoundingClientRect().height };
  });
  expect(style.bgImage, "gold CTA must keep its gradient background").toContain("gradient");
  expect(px(style.padT), "gold CTA must keep vertical padding").toBeGreaterThanOrEqual(12); // py-4 = 16px
  expect(style.h, "gold CTA must be a real tappable height").toBeGreaterThanOrEqual(44);
});

test("sentinel: a freshly injected utility element computes non-zero (cause-agnostic)", async ({ page }) => {
  await prep(page);
  await page.goto("/money");
  await expect(page.getByText(/钱对你/).first()).toBeVisible({ timeout: 8000 });

  // Inject elements using core utilities known to be in the compiled bundle.
  // This proves the cascade is healthy independent of any specific page markup.
  // Covers spacing AND gap/border/radius — the properties an adversarial review
  // (2026-06-16) showed a future reset could zero while page-specific assertions
  // stayed green (the incident note itself flagged `gap` as the survivor).
  const probe = await page.evaluate(() => {
    const box = document.createElement("div");
    box.className = "px-5 py-8 mt-6 flex gap-4 rounded-xl border";
    document.body.appendChild(box);
    const cs = getComputedStyle(box);
    const r = {
      padL: cs.paddingLeft, padT: cs.paddingTop, mt: cs.marginTop,
      gap: cs.columnGap || cs.gap, radius: cs.borderTopLeftRadius, borderW: cs.borderTopWidth,
    };
    box.remove();
    return r;
  });
  expect(parseFloat(probe.padL), "px-5").toBeGreaterThanOrEqual(16);
  expect(parseFloat(probe.padT), "py-8").toBeGreaterThanOrEqual(24);
  expect(parseFloat(probe.mt), "mt-6").toBeGreaterThanOrEqual(20);
  expect(parseFloat(probe.gap), "gap-4").toBeGreaterThanOrEqual(12);     // gap-4 = 16px
  expect(parseFloat(probe.radius), "rounded-xl").toBeGreaterThanOrEqual(8);
  expect(parseFloat(probe.borderW), "border").toBeGreaterThanOrEqual(1);
});
