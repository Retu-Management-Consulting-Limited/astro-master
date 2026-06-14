import { test, expect, type Page } from "@playwright/test";

// Kill CSS animations (spinning eye motifs break click stability), hide the
// Next dev indicator + install banner so they don't intercept clicks.
async function quietPage(page: Page, hideInstall = true) {
  await page.addInitScript((hide) => {
    const s = document.createElement("style");
    s.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}[data-testid=feedback-fab]{display:none!important}" +
      (hide ? "[data-testid=install-prompt]{display:none!important}" : "");
    document.documentElement.appendChild(s);
  }, hideInstall);
}

// Walk landing → … → today; leaves the page on /today with a populated store.
async function walkToToday(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /看穿你/ }).click();
  await expect(page).toHaveURL(/\/input/);
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

test("activation funnel: landing → input → calibration → first-read → register → today", async ({ page }) => {
  await quietPage(page);

  await walkToToday(page);
  await expect(page.getByText("我有三句话")).toBeVisible();

  // Tabs navigate
  await page.locator('a[href="/chart"]').click();
  await expect(page.locator('[data-testid="chart"]')).toBeVisible({ timeout: 5000 });
  // 主题深读: tap a theme card → deep read woven with a real placement
  await page.locator('[data-testid="theme-row"]').first().click();
  await expect(page.locator('[data-testid="theme"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="theme-read"]')).toContainText("宫");
  await page.goBack();
  await expect(page.locator('[data-testid="chart"]')).toBeVisible({ timeout: 5000 });
  await page.locator('a[href="/chat"]').click();
  await expect(page.locator('[data-testid="chat"]')).toBeVisible({ timeout: 5000 });
  // (chat send fires a real backend call under AI=on; verified separately to
  // avoid a second concurrent SDK subprocess starving the dev server here)
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

  // 历史回看: honest day-1 timeline echoing the first-read quote
  await page.locator('[data-testid="row-history"]').click();
  await expect(page.locator('[data-testid="history"]')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("第一天 · 你让我看你的盘")).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });

  await page.locator('[data-testid="row-share"]').click();
  await expect(page.locator('[data-testid="share"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="share-card"] svg')).toBeVisible();
  // switch template
  await page.locator('[data-testid="tpl"]').nth(1).click();
  // export to PNG (no real share sheet in headless → download path + toast)
  await page.locator('[data-testid="save-png"]').click();
  await expect(page.getByText(/保存图片|唤起分享/)).toBeVisible({ timeout: 5000 });
});

test("PWA install prompt: appears post-activation on /today and is dismissable", async ({ page }) => {
  await quietPage(page, false); // keep the install banner visible

  await walkToToday(page);
  const prompt = page.locator('[data-testid="install-prompt"]');
  await expect(prompt).toBeVisible({ timeout: 6000 });
  await expect(prompt.getByText("把 Molly 放进你的口袋")).toBeVisible();

  // dismissing (✕) hides it and remembers the choice across reloads
  await prompt.getByText("✕").click();
  await expect(prompt).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(3200);
  await expect(page.locator('[data-testid="install-prompt"]')).toBeHidden();
});

test("settings: AI disclosure + data deletion wipes everything → landing", async ({ page }) => {
  await quietPage(page);
  await walkToToday(page);

  await page.locator('a[href="/me"]').click();
  await expect(page.locator('[data-testid="me"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="row-me/settings"]').click();
  await expect(page.locator('[data-testid="settings"]')).toBeVisible({ timeout: 5000 });

  // AI disclosure must be present (product responsibility)
  await expect(page.getByText(/由 AI 驱动/)).toBeVisible();
  await expect(page.getByText(/不构成医疗、法律或投资建议/)).toBeVisible();

  // Delete all data → confirm → back to landing, store wiped
  page.once("dialog", (d) => d.accept());
  await page.locator('[data-testid="delete-data"]').click();
  await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
  await expect(page.getByText("我直接看穿你")).toBeVisible();

  // Visiting a gated page now redirects to /input (data really gone)
  await page.goto("/today");
  await expect(page).toHaveURL(/\/input/, { timeout: 5000 });
});
