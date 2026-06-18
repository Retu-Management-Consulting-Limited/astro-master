// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";

// 隔离掉 i18n 导航（它内部依赖 next router 上下文，单测里不可用）。
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/me/settings",
}));

import { LocaleSwitcher } from "./LocaleSwitcher";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const zh = loadMessages("zh");

function renderSwitcher(locale = "zh") {
  return render(
    <NextIntlClientProvider locale={locale} messages={zh}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher · RU_PUBLIC 关（生产默认）", () => {
  it("不列出 ru 选项（俄语不对用户暴露）", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    renderSwitcher("zh");
    const options = screen.getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(options).toContain("zh");
    expect(options).not.toContain("ru");
  });
});

describe("LocaleSwitcher · RU_PUBLIC 开（测试/复核后）", () => {
  it("列出 zh + ru 两个选项", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "1");
    renderSwitcher("zh");
    const options = screen.getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(options).toContain("zh");
    expect(options).toContain("ru");
  });
});

describe("LocaleSwitcher · 防御：当前在 ru 页但 flag 关时仍含 ru option", () => {
  it("select value=ru 时下拉里有 ru，避免选中项消失", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    renderSwitcher("ru");
    const options = screen.getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(options).toContain("ru");
  });
});
