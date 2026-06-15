import { test, expect, type Page } from "@playwright/test";
import { computeChart } from "../src/lib/astro/chart";

// Seed a chart straight into the persisted store so the money funnel is tested
// in isolation from the AI-dependent onboarding walk (fast + reliable).
const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const SEED = JSON.stringify({ state: { chart, joinedAt: Date.UTC(2026, 0, 1), nickname: "小测" }, version: 0 });

async function prep(page: Page) {
  await page.addInitScript((seed) => {
    localStorage.setItem("molly-funnel", seed);
  }, SEED);
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}[data-testid=feedback-fab]{display:none!important}[data-testid=install-prompt]{display:none!important}";
    document.documentElement.appendChild(s);
  });
}

test("S0 entry card on /today links into the money funnel", async ({ page }) => {
  await prep(page);
  await page.goto("/today");
  const entry = page.locator('[data-testid="money-entry"]').first();
  await expect(entry).toBeVisible({ timeout: 8000 });
  await entry.click();
  await expect(page).toHaveURL(/\/money$/);
});

test("money funnel: reveal → correct → daily story (guardrail-clean)", async ({ page }) => {
  await prep(page);
  await page.goto("/money");

  // S1 钩尖揭示 — confident framing, never "说中了吗"
  await expect(page.getByText(/钱对你/).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/说中了吗/)).toHaveCount(0);

  // S1 → S1b 修正 (看得更多)
  await page.getByRole("button", { name: /看我的金钱故事/ }).click();
  await expect(page.getByText(/另一面|更像此刻的你/).first()).toBeVisible();

  // 继续 → /money/today
  await page.getByRole("button", { name: /继续/ }).click();
  await expect(page).toHaveURL(/\/money\/today/);
  const story = page.locator('[data-testid="money-story"]');
  await expect(story).toBeVisible({ timeout: 15000 });

  // Guardrail: rendered story never shows an amount × unit (不报数字)
  const text = await story.innerText();
  expect(text).not.toMatch(/\d+\s*(万|元|块|千)/);

  // H3 accuracy capture works
  await page.getByRole("button", { name: "好准" }).click();
  await expect(page.getByText(/收到/)).toBeVisible();
});
