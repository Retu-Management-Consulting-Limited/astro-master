import { test, expect } from "@playwright/test";
import { computeChart } from "../src/lib/astro/chart";
import { generateFirstRead } from "../src/lib/reading/generate";

// Seed a complete funnel so /today renders without walking onboarding (which uses
// a native date picker under a mobile UA). Then spoof the UA per environment and
// assert InstallPrompt lands on the right A2HS state (detectA2HS wiring → UI).
const chart = computeChart({ year: 1995, month: 6, day: 15, hour: 14, minute: 30, lat: 31.23, lng: 121.47, tz: 8 });
const SEED = JSON.stringify({
  state: { chart, birth: { year: 1995, month: 6, day: 15, hour: 14, minute: 30, lat: 31.23, lng: 121.47, tz: 8 }, birthForm: { date: "1995-06-15", time: "14:30", knownTime: true, country: "中国", city: "上海" }, firstRead: generateFirstRead(chart), nickname: "小满", gender: "female", joinedAt: 1718000000000 },
  version: 0,
});

async function seed(page: import("@playwright/test").Page) {
  await page.addInitScript((s) => localStorage.setItem("molly-funnel", s), SEED);
}

test.describe("iOS Safari → gold share-sheet card", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  test("shows ios-safari state with the share tutorial", async ({ page }) => {
    await seed(page);
    await page.goto("/today");
    const prompt = page.locator('[data-testid="install-prompt"]');
    await prompt.waitFor({ state: "visible", timeout: 8000 });
    await expect(prompt).toHaveAttribute("data-state", "ios-safari");
    await expect(prompt).toContainText("添加到主屏幕");
  });
});

test.describe("iOS WeChat → blue 'open in browser' card (§8 honesty: no useless tutorial)", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40" });
  test("shows ios-inapp state and a redirect CTA, not an install tutorial", async ({ page }) => {
    await seed(page);
    await page.goto("/today");
    const prompt = page.locator('[data-testid="install-prompt"]');
    await prompt.waitFor({ state: "visible", timeout: 8000 });
    await expect(prompt).toHaveAttribute("data-state", "ios-inapp");
    await expect(prompt).toContainText("Safari");
    await expect(prompt.getByRole("button", { name: /复制链接/ })).toBeVisible();
  });
});
