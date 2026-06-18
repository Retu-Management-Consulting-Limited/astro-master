import { describe, it, expect, afterEach, vi } from "vitest";
import { ruEnabled, publicLocales, isLocalePublic } from "./exposure";

// RU_PUBLIC 双态契约。vitest env 默认不设 NEXT_PUBLIC_RU_PUBLIC（= 关），
// 这里逐态 stub 验证。注意：guard 自己不依赖外部 flag 取值，故先存后还原。

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("exposure: RU_PUBLIC 关（生产默认）", () => {
  it("ruEnabled() === false", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    expect(ruEnabled()).toBe(false);
  });

  it("publicLocales() 只含默认 locale zh，不含 ru", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    expect(publicLocales()).toEqual(["zh"]);
  });

  it("isLocalePublic('ru') === false，isLocalePublic('zh') === true", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    expect(isLocalePublic("ru")).toBe(false);
    expect(isLocalePublic("zh")).toBe(true);
  });
});

describe("exposure: RU_PUBLIC 开（测试/CI/复核后）", () => {
  it("ruEnabled() === true", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "1");
    expect(ruEnabled()).toBe(true);
  });

  it("publicLocales() 含 zh + ru", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "1");
    expect(publicLocales().sort()).toEqual(["ru", "zh"]);
  });

  it("isLocalePublic('ru') === true", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "1");
    expect(isLocalePublic("ru")).toBe(true);
  });
});

describe("exposure: 任意非 '1' 值都视为关（只认显式开关）", () => {
  it("'0' / 'true' / 'yes' 都是关", () => {
    for (const v of ["0", "true", "yes", "TRUE"]) {
      vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", v);
      expect(ruEnabled(), `value ${v}`).toBe(false);
    }
  });
});
