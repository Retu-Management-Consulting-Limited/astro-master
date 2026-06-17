import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// GATE — layout 用了 viewportFit:"cover"（内容延伸到刘海/挖孔/手势条下），那么全屏
// 容器 .phone 必须用 env(safe-area-inset-*) 把内容避让回安全区，否则 PWA standalone
// 下顶部 header（返回键/品牌/标题）被状态栏挖孔遮挡、底部 TabBar/CTA 被手势条压。
// 实测证据（Pixel 5 实跑）：17 个页面顶部 34px 状态栏区全部命中 header 内容；
// today/chart/chat/me 的 TabBar navCutByGesture 全为 true。
const ROOT = join(__dirname, "..");
// i18n 重构后 <html>/viewport 从 app/layout.tsx 下移到 app/[locale]/layout.tsx
// （next-intl [locale] 段约定）；viewportFit:cover 不变，只是换了文件。
const layout = readFileSync(join(ROOT, "app/[locale]/layout.tsx"), "utf8");
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");

describe("safe-area guard：cover 模式下 .phone 必须避让安全区", () => {
  it("前提：layout 使用 viewportFit:cover", () => {
    expect(/viewportFit:\s*["']cover["']/.test(layout)).toBe(true);
  });
  it(".phone 顶部避让状态栏/挖孔（env(safe-area-inset-top)）", () => {
    expect(
      /env\(safe-area-inset-top\)/.test(css),
      ".phone 缺 env(safe-area-inset-top)：PWA 下顶部 header 会被状态栏/挖孔遮挡。给 .phone 加 padding-top:env(safe-area-inset-top)。",
    ).toBe(true);
  });
  it(".phone 底部避让手势导航条（env(safe-area-inset-bottom)）", () => {
    expect(
      /env\(safe-area-inset-bottom\)/.test(css),
      ".phone 缺 env(safe-area-inset-bottom)：PWA 下底部 TabBar/CTA 会被手势条压。给 .phone 加 padding-bottom:env(safe-area-inset-bottom)。",
    ).toBe(true);
  });
});
