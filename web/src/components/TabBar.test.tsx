// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { TabBar } from "./TabBar";

afterEach(cleanup);

// TabBar 文案现在走 next-intl 翻译，需要 provider 注入 messages。默认 locale 是 zh，
// 故这里用 zh 字典渲染——既有「今日/本命/对话/我的」断言因此原样保留。
// messages 已重构为 per-namespace（Task 1），通过合并 loader 取整包。
const zh = loadMessages("zh");
function renderTab(active: string) {
  return render(
    <NextIntlClientProvider locale="zh" messages={zh}>
      <TabBar active={active} />
    </NextIntlClientProvider>,
  );
}

// T4 Phase 3 · IA 重构：财运从 tab 降为「今日格 chip → /wealth 页」，TabBar 回到
// 4 tab（今日/本命/对话/我的）——对称于身心轨也走 chip→页、不占 tab。财运/身心两轨
// 都靠今日格双 chip 进各自日历，比常驻 tab 更好发现（design/23 终版 X）。
describe("TabBar · 回 4 tab（财运降 chip）", () => {
  it("renders exactly 4 tabs in order 今日/本命/对话/我的", () => {
    renderTab("today");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links.map((a) => a.textContent)).toEqual(["今日", "本命", "对话", "我的"]);
  });

  it("不再有 财运 tab，也没有指向 /wealth 的 tab", () => {
    renderTab("today");
    const links = screen.getAllByRole("link");
    expect(links.some((a) => a.textContent === "财运")).toBe(false);
    expect(links.some((a) => a.getAttribute("href") === "/wealth")).toBe(false);
  });

  it("the four tabs keep their existing hrefs", () => {
    renderTab("today");
    const byHref = (h: string) => screen.getAllByRole("link").find((a) => a.getAttribute("href") === h);
    expect(byHref("/today")).toBeTruthy();
    expect(byHref("/chart")).toBeTruthy();
    expect(byHref("/chat")).toBeTruthy();
    expect(byHref("/me")).toBeTruthy();
  });

  it("active=today marks ONLY the 今日 tab as current page", () => {
    renderTab("today");
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe("今日");
    expect(current[0].getAttribute("href")).toBe("/today");
  });

  // /wealth 与新 /body 复用 <TabBar> 满足 route-exit guard，但它们不再有「自己的」
  // active tab——传一个不匹配任何 tab 的 active（如 "wealth"）时，0 个 tab 被标 current，
  // 不会误高亮别的 tab。这是「页存在但不占 tab」的语义证据。
  it("active 指向已删的 tab（如 'money'/'wealth'）时，没有任何 tab 被标 current", () => {
    renderTab("wealth");
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(0);
  });
});
