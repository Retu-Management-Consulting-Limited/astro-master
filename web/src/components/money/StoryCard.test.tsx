// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StoryCard } from "./StoryCard";

afterEach(cleanup);

const base = {
  page: 1,
  isDayOne: true,
  weight: "heavy" as const,
  hopeNote: "你和钱的故事，正式翻开第一页。",
  prophecy: { type: "destiny" as const, text: "靠一次敢转向" },
};

describe("StoryCard", () => {
  it("Day-1 shows the opening label '从今天开始' and no 承前", () => {
    render(<StoryCard {...base} prev={null} />);
    expect(screen.getByText(/从今天开始/)).toBeTruthy();
  });
  it("Day-N shows page number and 承前", () => {
    render(<StoryCard {...base} page={18} isDayOne={false} prev="昨天你扛住了" />);
    expect(screen.getByText(/第 18 页/)).toBeTruthy();
    expect(screen.getByText(/昨天你扛住了/)).toBeTruthy();
  });
});
