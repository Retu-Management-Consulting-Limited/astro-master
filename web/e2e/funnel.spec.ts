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
  // 2 self-trait questions (back-compat ASC opener) …
  const opt = page.locator('[data-testid="cal-opt"]').first();
  await opt.waitFor({ state: "visible", timeout: 8000 });
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-testid="cal-opt"]').first().click();
    await page.waitForTimeout(400);
  }
  // … then the 人生大事 step: pick events (seeds the TimeBelief) and finish.
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

  // 财运日历 — T4 Phase 3: 财运不再是 tab（回 4 tab），改由今日格的「财运 chip」进入。
  // 走法同步改成 today → fortune-chip → /wealth（不再点已删的 a[href="/wealth"] tab）。
  await page.locator('a[href="/today"]').click();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 5000 });
  // 双 chip 恒在：财运 chip 进 /wealth、身心 chip 进 /body。这里走财运 chip。
  await page.locator('[data-testid="fortune-chip"]').click();
  await expect(page.locator('[data-testid="wealth"]')).toBeVisible({ timeout: 5000 });
  // /wealth 不再有自己的 active tab（财运降 chip）——TabBar 仍在（route-exit 出口），
  // 但 0 高亮。故不再断言 aria-current=='财运'；用 TabBar 渲染证明非死胡同即可。
  await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();
  // 月历: tap a future day → its money verdict preview renders in the detail card
  const days = page.locator('[data-testid="wealth-day"]');
  await expect(days.first()).toBeVisible();
  await days.last().click();
  await expect(page.locator('[data-testid="wealth-detail"]')).toBeVisible();
  // "看更深" hands off to the money mirror funnel (not a dead end)
  await page.locator('[data-testid="wealth-deeper"]').click();
  await expect(page).toHaveURL(/\/money$/, { timeout: 5000 });
  // /money is reached by push → its BackButton returns to the wealth calendar
  await page.getByRole("button", { name: "返回" }).first().click();
  await expect(page.locator('[data-testid="wealth"]')).toBeVisible({ timeout: 5000 });

  // 身心日历 — T4 Phase 4: 身心轨与财运对称，也由今日格的「身心 chip」进入（非 tab）。
  // 走法 today → body-chip → /body（同构月历，不漏屏）。
  await page.locator('a[href="/today"]').click();
  await expect(page.locator('[data-testid="today"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="body-chip"]').click();
  await expect(page.locator('[data-testid="body"]')).toBeVisible({ timeout: 5000 });
  // /body 同构于 /wealth：也无自己的 active tab，TabBar 仍渲染（route-exit 出口）。
  await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();
  // 月历: tap a future day → its body verdict preview renders in the detail card
  const bodyDays = page.locator('[data-testid="body-day"]');
  await expect(bodyDays.first()).toBeVisible();
  await bodyDays.last().click();
  await expect(page.locator('[data-testid="body-detail"]')).toBeVisible();
  // "看更深" 身心深度 → 对话（非死胡同）
  await page.locator('[data-testid="body-deeper"]').click();
  await expect(page).toHaveURL(/\/chat$/, { timeout: 5000 });

  // 合盘 — back to /today then leave via 我的
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
