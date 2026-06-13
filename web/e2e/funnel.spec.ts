import { test, expect } from "@playwright/test";

test("activation funnel: landing → input → calibration → first-read → register → today", async ({ page }) => {
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
  await page.getByRole("link", { name: /本命/ }).click();
  await expect(page.locator('[data-testid="chart"]')).toBeVisible({ timeout: 5000 });
  await page.getByRole("link", { name: /对话/ }).click();
  await expect(page.locator('[data-testid="chat"]')).toBeVisible({ timeout: 5000 });
  await page.getByRole("link", { name: /我的/ }).click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });
});
