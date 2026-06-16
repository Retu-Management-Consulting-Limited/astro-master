// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TabBar } from "./TabBar";

afterEach(cleanup);

// The 财运 tab is the money funnel's persistent home (was reachable only via the
// 今日格 fortune-chip / red-day door). It must sit 2nd of 5 and point at /wealth.
describe("TabBar · 财运 tab", () => {
  it("renders exactly 5 tabs in order 今日/财运/本命/对话/我的", () => {
    render(<TabBar active="today" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((a) => a.textContent)).toEqual(["今日", "财运", "本命", "对话", "我的"]);
  });

  it("财运 is the 2nd tab and its href is /wealth", () => {
    render(<TabBar active="today" />);
    const links = screen.getAllByRole("link");
    const money = links[1];
    expect(money.textContent).toBe("财运");
    expect(money.getAttribute("href")).toBe("/wealth");
  });

  it("active=money marks ONLY the 财运 tab as current page", () => {
    render(<TabBar active="money" />);
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe("财运");
    expect(current[0].getAttribute("href")).toBe("/wealth");
  });

  it("the other four tabs keep their existing hrefs", () => {
    render(<TabBar active="today" />);
    const byHref = (h: string) => screen.getAllByRole("link").find((a) => a.getAttribute("href") === h);
    expect(byHref("/today")).toBeTruthy();
    expect(byHref("/chart")).toBeTruthy();
    expect(byHref("/chat")).toBeTruthy();
    expect(byHref("/me")).toBeTruthy();
  });
});
