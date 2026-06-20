import { test, expect, type Page } from "@playwright/test";
import { computeChart } from "../src/lib/astro/chart";
import { generateFirstRead } from "../src/lib/reading/generate";

// ── 渲染层机器闸（i18n 漏译这一类错的硬化）─────────────────────────────────────
// 用「非中文用户数据」seed 一个 ru 用户，走遍主要 /ru 路由，断言渲染出的可见文本
// 零 CJK 码点。它在【输出层】兜底：不管中文来自 messages、确定性内容表、还是 LLM，
// 只要到达 ru 屏幕就红——堵死 src 层 no-cjk guard 对 C 区（lib/ai|reading|api）的豁免。
// 完成判据：本闸绿 = 俄语真没漏。新增 /ru 内容页须加进 ROUTES。

const birth = { year: 1995, month: 6, day: 15, hour: 14, minute: 30, lat: 31.23, lng: 121.47, tz: 8 };
const chart = computeChart(birth);
// 关键：seed 全用俄文/拉丁，屏幕上任何 CJK = 未翻译的 APP 内容（而非用户数据）。
const SEED = JSON.stringify({
  state: {
    chart,
    birth,
    birthForm: { date: "1995-06-15", time: "14:30", knownTime: false, country: "Россия", city: "Москва" },
    firstRead: generateFirstRead(chart, "ru"),
    nickname: "Аня",
    gender: "female",
    joinedAt: 1718000000000,
  },
  version: 0,
});

// 覆盖所有承载确定性内容的用户面 /ru 路由（chat/reading 纯 LLM 暂不入闸，靠 locale
// 穿透单独保证；其内容若漏中文由后续扩展覆盖）。
const ROUTES = [
  "/ru",
  "/ru/input",
  "/ru/register",
  "/ru/calibration",
  "/ru/today",
  "/ru/chart",
  "/ru/body",
  "/ru/wealth",
  "/ru/money",
  "/ru/synastry",
  "/ru/theme/love",
  "/ru/me",
  "/ru/me/settings",
  "/ru/history",
];

async function cjkOnPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // 排除语言切换器（合法地列出「中文」）与所有 <select>
    document.querySelectorAll('[data-testid="locale-switcher"], select').forEach((e) => e.remove());
    const text = (document.body as HTMLElement).innerText || "";
    const m = text.match(/[㐀-鿿豈-﫿]+/g) || [];
    return [...new Set(m)].filter((s) => s !== "中文");
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((s) => localStorage.setItem("molly-funnel", s as string), SEED);
  await page.addInitScript(() => {
    const st = document.createElement("style");
    st.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important}[data-testid=install-prompt]{display:none!important}[data-testid=feedback-fab]{display:none!important}";
    document.documentElement.appendChild(st);
  });
});

for (const route of ROUTES) {
  test(`ru 渲染零中文：${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    // 等客户端内容表挂载渲染（确定性内容在 mount 即出）。
    await page.waitForTimeout(1000);
    const leaks = await cjkOnPage(page);
    expect(leaks, `中文泄漏于 ${route}：${leaks.join("  ·  ")}`).toEqual([]);
  });
}
