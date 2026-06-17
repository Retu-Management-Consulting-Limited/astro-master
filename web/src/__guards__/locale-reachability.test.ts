import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { routing } from "../i18n/routing";

// GATE — 把「i18n：每个页面路由在 zh/ru 都可达」从靠自觉升级成机器强制。
// next-intl 的 [locale] 前缀路由要求所有页面路由都活在 app/[locale]/ 段下，
// 否则该页只在默认 locale 可达、ru 下 404（链路在文件层就漏了，e2e 未必覆盖到）。
// 谁新增页面忘了放进 [locale] → 本测试红 → CI 拦下。
describe("locale reachability", () => {
  it("all page routes live under app/[locale]", () => {
    const appDir = join(process.cwd(), "src/app");
    const top = readdirSync(appDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    // app/ 顶层只允许 [locale] 和 api（外加无目录的根文件）
    const allowed = new Set(["[locale]", "api"]);
    const stray = top.filter((d) => !allowed.has(d));
    expect(stray).toEqual([]);
  });

  it("routing exposes both locales", () => {
    expect(routing.locales).toContain("zh");
    expect(routing.locales).toContain("ru");
  });
});
