import { describe, it, expect } from "vitest";
import { validateMoneyCopy } from "./guardrail";

describe("money guardrail", () => {
  it("BLOCKS a falsifiable amount × future-date prophecy", () => {
    expect(validateMoneyCopy("你明年会赚 50 万").ok).toBe(false);
    expect(validateMoneyCopy("3个月内进账 8000 元").ok).toBe(false);
  });
  it("BLOCKS shame copy", () => {
    expect(validateMoneyCopy("你这样下去会越来越穷").ok).toBe(false);
    expect(validateMoneyCopy("再不理财你就完了").ok).toBe(false);
  });
  it("BLOCKS gambling/speculation incitement", () => {
    expect(validateMoneyCopy("今天就该梭哈，敢赌一把").ok).toBe(false);
    expect(validateMoneyCopy("加杠杆冲一波").ok).toBe(false);
  });
  it("PASSES safe hope/agency copy (no number, no shame, no gambling)", () => {
    expect(validateMoneyCopy("9到11月是你最旺的扩张窗口，敢往前一步胜算偏高").ok).toBe(true);
    expect(validateMoneyCopy("你这辈子的钱，靠一次敢转向").ok).toBe(true);
  });
  it("PASSES a magnitude texture without a number", () => {
    expect(validateMoneyCopy("不是小数目，是够你喘口气的一笔").ok).toBe(true);
  });
});
