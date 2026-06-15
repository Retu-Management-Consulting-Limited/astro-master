import { test, expect, type Page } from "@playwright/test";

async function quiet(page: Page) {
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important;pointer-events:none!important}[data-testid=feedback-fab]{display:none!important}[data-testid=install-prompt]{display:none!important}";
    document.documentElement.appendChild(s);
  });
}

// Seed localStorage molly-funnel BEFORE the app boots (simulates a deep-link /
// PWA cold start where the store hydrates from disk).
function seedFunnel(page: Page, state: Record<string, unknown>) {
  return page.addInitScript((st) => {
    localStorage.setItem("molly-funnel", JSON.stringify({ state: st, version: 0 }));
  }, state);
}

const validChart = {
  ascSign: "天蝎", ascSignIndex: 7, asc: 210, mc: 120, aspects: [],
  placements: [
    { body: "Sun", sign: "双子", house: 8, lon: 80, degInSign: 20, signIndex: 2 },
    { body: "Moon", sign: "巨蟹", house: 9, lon: 100, degInSign: 10, signIndex: 3 },
  ],
};

test("H2-sweep: a dirty/half chart redirects to /input instead of crashing gated pages", async ({ page }) => {
  await quiet(page);
  // placements:[] is invalid per isFullChart → guard must treat as no chart.
  await seedFunnel(page, { chart: { ascSign: "天蝎", ascSignIndex: 7, asc: 1, mc: 1, aspects: [], placements: [] }, nickname: "测", joinedAt: 1 });
  for (const path of ["/today", "/chart", "/wealth", "/share"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/input/, { timeout: 8000 });
    // not the ErrorBoundary
    await expect(page.getByText(/星图转动时卡了一下/)).toHaveCount(0);
  }
});

test("H1: /me/birth deep-link refills the user's real stored data (no demo overwrite)", async ({ page }) => {
  await quiet(page);
  await seedFunnel(page, {
    chart: validChart,
    birth: { year: 1990, month: 3, day: 15, hour: 6, minute: 30, lat: 39.9, lng: 116.4, tz: 8 },
    birthForm: { date: "1990-03-15", time: "06:30", knownTime: false, country: "中国", city: "北京" },
    gender: "male",
    nickname: "阿明",
    joinedAt: 1,
  });
  await page.goto("/me/birth");
  await expect(page.locator('[data-testid="edit-birth"]')).toBeVisible({ timeout: 8000 });
  // Form shows REAL stored values, not demo defaults (1998-06-13 / female).
  await expect(page.locator("#edit-date")).toHaveValue("1990-03-15");
  await expect(page.locator('[data-testid="edit-city"]')).toHaveValue("北京");
  await expect(page.locator("#edit-country")).toHaveValue("中国");
  await expect(page.locator('[data-testid="edit-gender-male"]')).toHaveAttribute("aria-pressed", "true");
});
