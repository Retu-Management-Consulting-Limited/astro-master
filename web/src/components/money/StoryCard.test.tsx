// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { StoryCard } from "./StoryCard";

afterEach(cleanup);

// StoryCard 文案走 next-intl（namespace money.story），需 provider 注入 messages。
// 默认 locale zh，故既有中文断言原样保留（zh 逐字搬入 messages）。
const ZH = loadMessages("zh");

const base = {
  page: 1,
  isDayOne: true,
  weight: "heavy" as const,
  hopeNote: "你和钱的故事，正式翻开第一页。",
  prophecy: { type: "destiny" as const, text: "靠一次敢转向" },
};

function renderCard(props: Parameters<typeof StoryCard>[0]) {
  return render(
    <NextIntlClientProvider locale="zh" messages={ZH}>
      <StoryCard {...props} />
    </NextIntlClientProvider>,
  );
}

describe("StoryCard", () => {
  it("Day-1 shows the opening label '从今天开始' and no 承前", () => {
    renderCard({ ...base, prev: null });
    expect(screen.getByText(/从今天开始/)).toBeTruthy();
  });
  it("Day-N shows page number and 承前", () => {
    renderCard({ ...base, page: 18, isDayOne: false, prev: "昨天你扛住了" });
    expect(screen.getByText(/第 18 页/)).toBeTruthy();
    expect(screen.getByText(/昨天你扛住了/)).toBeTruthy();
  });
});
