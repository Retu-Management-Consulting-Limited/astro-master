import { describe, it, expect } from "vitest";
import { daysInMonth, clampDay } from "./BirthDateField";

describe("daysInMonth", () => {
  it("普通月份天数", () => {
    expect(daysInMonth(2023, 1)).toBe(31);
    expect(daysInMonth(2023, 4)).toBe(30);
    expect(daysInMonth(2023, 12)).toBe(31);
  });
  it("闰年规则：能被4整除是闰年、被100整除不是、被400整除又是", () => {
    expect(daysInMonth(2024, 2)).toBe(29); // 闰年
    expect(daysInMonth(2023, 2)).toBe(28); // 平年
    expect(daysInMonth(2000, 2)).toBe(29); // 被400整除 → 闰年
    expect(daysInMonth(1900, 2)).toBe(28); // 被100不被400 → 平年
  });
});

describe("clampDay", () => {
  it("超出当月天数时收敛到月末", () => {
    expect(clampDay(2023, 2, 31)).toBe(28); // 2 月平年
    expect(clampDay(2024, 2, 31)).toBe(29); // 2 月闰年
    expect(clampDay(2023, 4, 31)).toBe(30); // 4 月只有 30
  });
  it("合法日期保持不变", () => {
    expect(clampDay(2023, 1, 15)).toBe(15);
    expect(clampDay(2023, 12, 31)).toBe(31);
  });
});
