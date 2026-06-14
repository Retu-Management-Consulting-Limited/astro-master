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

test("synastry invite: A invites → B submits real birth → A sees real partner", async ({ page, context }) => {
  await quietPage(page);
  await walkToToday(page);

  // A opens synastry and creates an invite link
  await page.goto("/synastry");
  await expect(page.locator('[data-testid="synastry"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="syn-invite-btn"]').click();
  const url = await page.locator('[data-testid="syn-invite-url"]').textContent();
  expect(url).toContain("/synastry/invite/");

  // B opens the link in a separate page and submits real birth data
  const b = await context.newPage();
  await quietPage(b);
  await b.goto(url!.trim());
  await expect(b.locator('[data-testid="syn-invite"]')).toBeVisible({ timeout: 5000 });
  await b.locator('[data-testid="inv-name"]').fill("小鱼");
  await b.locator('#inv-date').fill("1996-01-01"); // birth fields no longer pre-filled (B4)
  await b.locator('#inv-time').fill("12:00");
  await b.locator('[data-testid="inv-city"]').fill("上海");
  await b.locator('[data-testid="inv-submit"]').click();
  await expect(b.locator('[data-testid="invite-done"]')).toBeVisible({ timeout: 8000 });
  await b.close();

  // A's page polls and switches to the real partner
  await expect(page.locator('[data-testid="syn-partner-real"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-testid="syn-partner-real"]')).toContainText("小鱼");

  // a real compatibility result still renders
  await page.locator('[data-testid="syn-type"]').first().click();
  await expect(page.locator('[data-testid="syn-result"]')).toBeVisible({ timeout: 5000 });
});

test("synastry invite: invalid token shows a friendly message", async ({ page }) => {
  await quietPage(page);
  await page.goto("/synastry/invite/deadbeefdeadbeefdeadbeef");
  await expect(page.locator('[data-testid="invite-invalid"]')).toBeVisible({ timeout: 5000 });
});
