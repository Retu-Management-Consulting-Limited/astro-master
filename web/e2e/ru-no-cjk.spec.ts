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
//
// 注意：/ru/calibration 与 /ru/synastry 不在此「首屏即出」清单里——它们的中文内容
// 藏在交互后才渲染的分支（calibration 的人生大事题、synastry 的合盘解读正文），
// 默认 seed 的首屏走不到，会假绿。它们各有一个【驱动到内容分支】的专用 test（见下）。
const ROUTES = [
  "/ru",
  "/ru/input",
  "/ru/register",
  "/ru/today",
  "/ru/chart",
  "/ru/body",
  "/ru/wealth",
  "/ru/money",
  "/ru/theme/love",
  "/ru/me",
  "/ru/me/settings",
  "/ru/history",
];

// 已配对 partner chart——用同一个 computeChart 产出结构完整的盘（过 isFullChart），
// 让 synastry 页能加载出【真实合盘】分支（demo=false → 渲染 synScaffold 解读正文）。
const partnerChart = computeChart({ year: 1992, month: 3, day: 8, hour: 9, minute: 0, lat: 55.75, lng: 37.61, tz: 3 });
const SAVED_PARTNERS = JSON.stringify([
  { token: "e2e-seed-token", name: "Борис", chart: partnerChart, at: 1718000000000 },
]);

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

// ── /ru/calibration：驱动到「人生大事」内容分支 ──────────────────────────────
// 首屏是自我特质题（两问，纯 messages）；真正藏中文的是第三步的人生大事题
// （EVENT_OPTIONS / calibrationEvents）。点两次特质选项推进到事件步再断言，
// 否则永远停在首屏 = 假绿。
test("ru 渲染零中文：/ru/calibration（人生大事内容分支）", async ({ page }) => {
  await page.goto("/ru/calibration", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  // LoadingRitual 先挡一拍，等特质选项出现再开始点。
  await page.waitForSelector('[data-testid="cal-opt"]', { timeout: 5000 });
  // 两道特质题，每题点第一个选项推进（pick() 有 280ms 过渡）。
  for (let q = 0; q < 2; q++) {
    await page.locator('[data-testid="cal-opt"]').first().click();
    await page.waitForTimeout(350);
  }
  // 到达人生大事步：等事件 chip 渲染，并展开一个事件的年龄滑块（更多内容）。
  await page.waitForSelector('[data-testid="cal-event"]', { timeout: 5000 });
  await page.locator('[data-testid="cal-event"]').first().click();
  await page.waitForTimeout(300);
  const leaks = await cjkOnPage(page);
  expect(leaks, `中文泄漏于 /ru/calibration（events）：${leaks.join("  ·  ")}`).toEqual([]);
});

// ── /ru/synastry：驱动到合盘解读正文分支 ─────────────────────────────────────
// 首屏只有邀请面板 + 关系类型按钮（部分 messages）；真正藏中文的是选一个关系类型
// 后渲染的 Result——demo 分支出维度名（synastry.ts CONFIG label），真实配对分支出
// synScaffold 解读正文（vibe/body/catchLine）。这里 seed 一个已配对 partner，使
// Result 走【真实】分支（demo=false），覆盖全部合盘内容表。
test("ru 渲染零中文：/ru/synastry（合盘解读正文分支）", async ({ page }) => {
  // 额外塞入已合的人，使 realPartner 可被打开（demo=false 真实解读分支）。
  await page.addInitScript((s) => localStorage.setItem("molly_syn_partners", s as string), SAVED_PARTNERS);
  await page.goto("/ru/synastry", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  // 打开已保存的 partner → 回到选关系类型 → 选第一个类型渲染 Result 正文。
  await page.waitForSelector('[data-testid="syn-saved-open"]', { timeout: 5000 });
  await page.locator('[data-testid="syn-saved-open"]').first().click();
  await page.waitForTimeout(300);
  await page.waitForSelector('[data-testid="syn-type"]', { timeout: 5000 });
  await page.locator('[data-testid="syn-type"]').first().click();
  // 等 Result 解读正文挂载（synScaffold 即时出）。
  await page.waitForSelector('[data-testid="syn-result"]', { timeout: 5000 });
  await page.waitForTimeout(500);
  // 顺手展开一个维度下钻，覆盖相位/星体名（PLANETS/ASPECTS 已是 glossary，应不漏）。
  const dim = page.locator('[data-testid="syn-dim"]').first();
  if (await dim.count()) {
    await dim.click();
    await page.waitForTimeout(200);
  }
  const leaks = await cjkOnPage(page);
  expect(leaks, `中文泄漏于 /ru/synastry（result）：${leaks.join("  ·  ")}`).toEqual([]);
});
