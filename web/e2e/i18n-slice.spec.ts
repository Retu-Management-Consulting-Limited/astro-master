import { test, expect, type Page } from "@playwright/test";
import { computeChart } from "../src/lib/astro/chart";

test("zh landing at / renders Chinese + html lang=zh", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByText("不寒暄 · 直接说中")).toBeVisible();
});

test("ru landing at /ru renders Russian + html lang=ru", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByText("Без болтовни · Сразу по сути")).toBeVisible();
});

// Seed a complete chart into the persisted store so chart-gated pages render
// without the AI-dependent onboarding walk (mirrors money-mirror.spec.ts).
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

// Task 5 load-bearing assertion: a router.push("/money") fired from /ru/today
// (now going through @/i18n/navigation's locale-aware useRouter) must keep the
// /ru prefix. This is the whole point of migrating the navigation API.
test("navigation preserves ru locale", async ({ page }) => {
  await prep(page);
  await page.goto("/ru/today");
  const entry = page.locator('[data-testid="money-entry"]').first();
  await expect(entry).toBeVisible({ timeout: 8000 });
  await entry.click();
  await expect(page).toHaveURL(/\/ru\/money/);
});

// Task 6 load-bearing assertion: switching locale from the settings page must
// keep the user on the SAME page (settings), only swapping the locale prefix.
test("switcher keeps you on same page across locales", async ({ page }) => {
  await prep(page);
  await page.goto("/ru/me/settings");
  const select = page.locator('[data-testid="locale-switcher"]');
  await expect(select).toBeVisible({ timeout: 8000 });
  await expect(select).toHaveValue("ru");
  await select.selectOption("zh");
  await expect(page).toHaveURL(/\/me\/settings$/); // zh has no prefix (as-needed)
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
});
