import { test, expect } from "@playwright/test";

test("activation funnel: landing → input → calibration → first-read → register → today", async ({ page }) => {
  // Kill CSS animations so spinning eye motifs don't break click stability checks
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}";
    document.documentElement.appendChild(s);
  });

  // Landing
  await page.goto("/");
  await expect(page.getByText("我直接看穿你")).toBeVisible();
  await page.getByRole("link", { name: /看穿你/ }).click();

  // Input (prefilled) → submit
  await expect(page).toHaveURL(/\/input/);
  await page.getByRole("button", { name: /看你的盘/ }).click();

  // Calibration: wait past 排盘 loading for options, answer 3
  const opt = page.locator('[data-testid="cal-opt"]').first();
  await opt.waitFor({ state: "visible", timeout: 8000 });
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-testid="cal-opt"]').first().click();
    await page.waitForTimeout(400);
  }

  // First-read (激活峰): wait past 解读 loading
  await page.locator('[data-testid="firstread"]').waitFor({ state: "visible", timeout: 8000 });
  await expect(page.getByText("撕掉")).toBeVisible();
  await page.locator('[data-testid="chip"]').first().click();

  // Register → today
  await page.locator('[data-testid="login"]').first().waitFor({ state: "visible", timeout: 8000 });
  await page.locator('[data-testid="login"]').first().click();

  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("我有三句话")).toBeVisible();

  // Tabs navigate
  await page.locator('a[href="/chart"]').click();
  await expect(page.locator('[data-testid="chart"]')).toBeVisible({ timeout: 5000 });
  await page.locator('a[href="/chat"]').click();
  await expect(page.locator('[data-testid="chat"]')).toBeVisible({ timeout: 5000 });
  await page.locator('a[href="/me"]').click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });

  // 财运日历
  await page.locator('a[href="/today"]').click();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="fortune-chip"]').click();
  await expect(page.locator('[data-testid="wealth"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="wealth-day"]').first()).toBeVisible();

  // 合盘
  await page.goBack();
  await page.locator('a[href="/me"]').click();
  await page.locator('[data-testid="row-synastry"]').click();
  await expect(page.locator('[data-testid="synastry"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="syn-type"]').first().click();
  await expect(page.locator('[data-testid="syn-result"]')).toBeVisible();

  // 金句卡 share card — goBack from synastry returns to /me
  await page.goBack();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="row-share"]').click();
  await expect(page.locator('[data-testid="share"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="share-card"] svg')).toBeVisible();
  // switch template
  await page.locator('[data-testid="tpl"]').nth(1).click();
  // export to PNG (no real share sheet in headless → download path + toast)
  await page.locator('[data-testid="save-btn"]').click();
  await expect(page.getByText(/保存图片|唤起分享/)).toBeVisible({ timeout: 5000 });
});
