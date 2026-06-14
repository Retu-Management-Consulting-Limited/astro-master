import { describe, it, expect } from "vitest";
import { detectCrisis, CRISIS_RESPONSE, CRISIS_RESOURCES, CHAT_FALLBACK } from "./safety";

describe("detectCrisis", () => {
  it("catches explicit Chinese ideation", () => {
    for (const s of ["我不想活了", "感觉活不下去了", "我想自杀", "想结束自己的生命", "最近总想伤害自己", "活着没意思"]) {
      expect(detectCrisis(s)).toBe(true);
    }
  });
  it("catches explicit English ideation", () => {
    for (const s of ["I want to kill myself", "thinking about suicide", "I want to die", "self-harm again"]) {
      expect(detectCrisis(s)).toBe(true);
    }
  });
  it("does NOT false-positive on casual 死 usage", () => {
    for (const s of ["笑死我了", "今天累死了", "想死你了", "饿死了快", "热死人", "这题难死了"]) {
      expect(detectCrisis(s)).toBe(false);
    }
  });
  it("ignores empty / normal text", () => {
    expect(detectCrisis("")).toBe(false);
    expect(detectCrisis("今天我的财运怎么样")).toBe(false);
  });
});

describe("crisis response", () => {
  it("includes verified hotline resources and is not empty", () => {
    expect(CRISIS_RESOURCES.length).toBeGreaterThanOrEqual(4);
    expect(CRISIS_RESPONSE).toContain("010-82951332"); // mainland
    expect(CRISIS_RESPONSE).toContain("988"); // US
    expect(CRISIS_RESPONSE).toContain("2896 0000"); // HK
    expect(CRISIS_RESPONSE).toContain("13 11 14"); // AU
  });
  it("has a non-empty chat fallback", () => {
    expect(CHAT_FALLBACK.length).toBeGreaterThan(0);
  });
});
