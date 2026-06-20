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
  // P3-7: birth fields no longer pre-filled — enter them before submitting.
  await page.locator("#birth-year").selectOption("1990");
  await page.locator("#birth-month").selectOption("5");
  await page.locator("#birth-day").selectOption("15");
  await page.locator("#birth-city").fill("北京");
  await page.getByRole("button", { name: /看你的盘/ }).click();
  const opt = page.locator('[data-testid="cal-opt"]').first();
  await opt.waitFor({ state: "visible", timeout: 8000 });
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-testid="cal-opt"]').first().click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-testid="cal-event"]').first().waitFor({ state: "visible", timeout: 8000 });
  await page.locator('[data-testid="cal-event"]').nth(0).click();
  await page.locator('[data-testid="cal-event"]').nth(1).click();
  await page.locator('[data-testid="cal-finish"]').click();
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

  // birth info shown (the walk entered 北京)
  const summary = page.locator('[data-testid="birth-summary"]');
  await expect(summary).toContainText("北京");
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

// Journey-level gate: editing birth info re-resolves the chart, so the old
// firstRead (the "我眼中的你" self-quote, generated from the PREVIOUS chart) is
// now stale and must NOT linger. After save it should fall back, not show the
// old chart's quote. Property scans can't catch this — every value stays truthy.
test("editing birth info clears the stale firstRead — no old self-quote lingers", async ({ page }) => {
  await quietPage(page);
  await walkToToday(page);

  await page.locator('a[href="/me"]').click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });
  // A real firstRead exists from onboarding → the fallback quote is NOT shown yet.
  await expect(page.getByText(/先看看你自己/)).toHaveCount(0);

  // Edit birth → save → chart changes → old firstRead is stale.
  await page.locator('[data-testid="birth-card"]').click();
  await expect(page.locator('[data-testid="edit-birth"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="edit-city"]').fill("上海");
  await page.locator('[data-testid="save-birth"]').click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 8000 });

  // Stale firstRead must be gone → "我眼中的你" falls back to the default quote.
  await expect(page.getByText(/先看看你自己/)).toBeVisible();
});
