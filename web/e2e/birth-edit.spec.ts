import { test, expect, type Page } from "@playwright/test";

async function quietPage(page: Page) {
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}[data-testid=feedback-fab]{display:none!important}[data-testid=install-prompt]{display:none!important}";
    document.documentElement.appendChild(s);
  });
}

async function walkToToday(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /看穿你/ }).click();
  await page.getByRole("button", { name: /看你的盘/ }).click();
  const opt = page.locator('[data-testid="cal-opt"]').first();
  await opt.waitFor({ state: "visible", timeout: 8000 });
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-testid="cal-opt"]').first().click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-testid="firstread"]').waitFor({ state: "visible", timeout: 8000 });
  await page.locator('[data-testid="chip"]').first().click();
  await page.locator('[data-testid="login"]').first().waitFor({ state: "visible", timeout: 8000 });
  await page.locator('[data-testid="login"]').first().click();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });
}

test("birth info is visible on /me and editable; a change re-resolves the chart", async ({ page }) => {
  await quietPage(page);
  await walkToToday(page);

  await page.locator('a[href="/me"]').click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });

  // birth info shown (default funnel city is 墨尔本)
  const summary = page.locator('[data-testid="birth-summary"]');
  await expect(summary).toContainText("墨尔本");
  const before = await summary.textContent();

  // edit → change city to a different real city → save → back on /me, summary updated
  await page.locator('[data-testid="birth-card"]').click();
  await expect(page.locator('[data-testid="edit-birth"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="edit-city"]').fill("上海");
  await page.locator('[data-testid="save-birth"]').click();

  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 8000 });
  await expect(summary).toContainText("上海");
  expect(await summary.textContent()).not.toBe(before);
});

test("editing to an unknown city shows an error, does not navigate away", async ({ page }) => {
  await quietPage(page);
  await walkToToday(page);
  await page.locator('a[href="/me"]').click();
  await page.locator('[data-testid="birth-card"]').click();
  await expect(page.locator('[data-testid="edit-birth"]')).toBeVisible({ timeout: 5000 });

  await page.locator('[data-testid="edit-city"]').fill("zzznoplaceqq");
  await page.locator('[data-testid="save-birth"]').click();
  await expect(page.locator('[data-testid="edit-err"]')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('[data-testid="edit-birth"]')).toBeVisible(); // stayed on page
});
