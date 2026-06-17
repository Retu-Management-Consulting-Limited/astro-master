import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// GATE — 把「Flow-Completeness：只做目的地、漏掉离开路径」从一条靠自觉的文档
// house rule，升级成机器强制。每个路由页（page.tsx）必须给用户一条离开的路：
//   - <BackButton />  栈式返回；或
//   - <TabBar />      底部 tab 根（today/chat/chart/me）；或
//   - 显式登记在 EXEMPT 里并写明「为什么这页不需要返回键」。
// 谁新增页面忘了出口 → 本测试红 → CI 拦下。money/today 死胡同就是漏了这条。

const APP_DIR = join(__dirname, "..", "app");

// 豁免名单：每条都要有理由。想豁免就得先想清楚「这页怎么离开」，
// 而不是默默漏掉——这正是 gate 的意义。
const EXEMPT: Record<string, string> = {
  "/": "landing：未注册的入口屏，向前进入 onboarding，无可返回的上一步",
  "/input": "onboarding 线性流程屏：自带步骤前进/后退控件，非栈式页面",
  "/calibration": "onboarding 线性流程屏：自带步骤控件",
  "/register": "onboarding 线性流程屏：自带步骤控件",
  "/reading": "首读漏斗屏：所有 CTA 都 router.push('/register')，靠前进离开（注册墙）",
  "/synastry/invite/[token]": "外部邀请落地页：被邀请者从链接进入，线性流程，含 <a href='/'> 出口",
  "/admin": "内部运营工具：独立入口（直接敲 URL），不接回用户 app，死在 admin 内可接受",
};

function listPages(dir: string, route = ""): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      // 路由组 (...) 不计入路径；i18n 的 [locale] 前缀段也不计入——它只是
      // 语言前缀，语义路由不变（/[locale]/today 仍是 /today），EXEMPT 沿用。
      const seg = name.startsWith("(") || name === "[locale]" ? "" : `/${name}`;
      out.push(...listPages(full, route + seg));
    } else if (name === "page.tsx") {
      out.push({ route: route || "/", file: full });
    }
  }
  return out;
}

describe("route-exit guard：每个页面都不能是死胡同", () => {
  const pages = listPages(APP_DIR);

  it.each(pages)("$route 有离开路径（BackButton / TabBar / 显式豁免）", ({ route, file }) => {
    const src = readFileSync(file, "utf8");
    // 认标准组件，也认手搓但语义正确的出口（aria-label 返回/关闭）。
    // 注：理想是统一用 <BackButton/>（F/R1），/synastry 目前是手搓 ←，可后续重构。
    const hasExit =
      /\bBackButton\b/.test(src) ||
      /\bTabBar\b/.test(src) ||
      /aria-label=["'](返回|关闭)["']/.test(src);
    const exempt = route in EXEMPT;
    expect(
      hasExit || exempt,
      `${route} 没有任何离开路径：缺 BackButton/TabBar，也未登记豁免。` +
        `\n要么给它加返回键，要么在 route-exit.test.ts 的 EXEMPT 里登记并写明理由。`,
    ).toBe(true);
  });
});
