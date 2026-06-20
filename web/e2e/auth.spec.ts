import { test, expect, type Page } from "@playwright/test";

async function quietPage(page: Page) {
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}[data-testid=feedback-fab]{display:none!important}[data-testid=install-prompt]{display:none!important}";
    document.documentElement.appendChild(s);
  });
}

// After sign-up, a one-tap daily-reminder card may appear (only when push is
// available, e.g. VAPID configured). Dismiss it if present, then we're on /today.
async function dismissNotifyIfShown(page: Page) {
  await page.locator('[data-testid="notify-skip"], [data-testid="today"]').first().waitFor({ timeout: 8000 });
  if (await page.locator('[data-testid="notify-skip"]').count()) {
    await page.locator('[data-testid="notify-skip"]').click();
  }
}

// Walk landing → input → calibration → first-read → /register (stops there).
async function walkToRegister(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /看穿你/ }).click();
  await expect(page).toHaveURL(/\/input/);
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
  await page.locator('[data-testid="account-submit"]').waitFor({ state: "visible", timeout: 8000 });
}

test("real account: register persists the chart; fresh-device login restores it", async ({ page, context }) => {
  await quietPage(page);
  await walkToRegister(page);

  const email = `e2e-${Date.now()}@test.dev`;
  await page.locator('[data-testid="email"]').fill(email);
  await page.locator('[data-testid="password"]').fill("password1");
  await page.locator('[data-testid="account-submit"]').click();
  await dismissNotifyIfShown(page);
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });

  // Account exists server-side with the chart attached.
  const me = await page.request.get("/api/auth/me");
  expect(me.ok()).toBeTruthy();
  const meJson = await me.json();
  expect(meJson.email).toBe(email);
  expect(meJson.profile?.chart).toBeTruthy();

  // Simulate a FRESH DEVICE: clear localStorage AND cookies (logged out, no local chart).
  await page.evaluate(() => localStorage.clear());
  await context.clearCookies();

  // A gated page now bounces to /input (data really is gone locally).
  await page.goto("/today");
  await expect(page).toHaveURL(/\/input/, { timeout: 8000 });

  // Log back in → chart restored from the account → land on /today.
  await page.goto("/register");
  await page.getByText("登录", { exact: true }).click();
  await page.locator('[data-testid="email"]').fill(email);
  await page.locator('[data-testid="password"]').fill("password1");
  await page.locator('[data-testid="account-submit"]').click();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });

  // And the settings page shows the bound email + can log out.
  await page.goto("/me/settings");
  await expect(page.locator('[data-testid="account-email"]')).toContainText(email);
});

test("wrong password is rejected", async ({ page }) => {
  await quietPage(page);
  await walkToRegister(page);

  const email = `e2e-bad-${Date.now()}@test.dev`;
  await page.locator('[data-testid="email"]').fill(email);
  await page.locator('[data-testid="password"]').fill("password1");
  await page.locator('[data-testid="account-submit"]').click();
  await dismissNotifyIfShown(page);
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });

  // log out via settings (now clears local data + redirects to landing, L3),
  // then attempt login with a wrong password
  await page.goto("/me/settings");
  await page.locator('[data-testid="logout"]').click();
  await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
  await page.goto("/register");
  await page.getByText("登录", { exact: true }).click();
  await page.locator('[data-testid="email"]').fill(email);
  await page.locator('[data-testid="password"]').fill("WRONG-pass-9");
  await page.locator('[data-testid="account-submit"]').click();
  await expect(page.locator('[data-testid="auth-err"]')).toBeVisible({ timeout: 6000 });
});
