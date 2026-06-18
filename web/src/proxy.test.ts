import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(`https://x.test${path}`), { headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("proxy: next-intl + mid cookie", () => {
  it("sets mid cookie when absent on a page request", () => {
    const res = proxy(req("/today"));
    expect(res.cookies.get("mid")?.value).toBeTruthy();
  });

  it("does not overwrite an existing mid cookie", () => {
    const res = proxy(req("/today", { cookie: "mid=keep-me" }));
    // 已存在则不应再下发新的 mid（Set-Cookie 不含 mid 覆盖）
    expect(res.cookies.get("mid")?.value).toBeUndefined();
  });

  it("redirects ru Accept-Language visitor to /ru on root", () => {
    const res = proxy(req("/", { "accept-language": "ru-RU,ru;q=0.9" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/ru");
  });
});

// RU_PUBLIC 闸的双态契约（承重风险：flag 关时手动访问 /ru 必须重定向回默认
// locale 并剥前缀；flag 开时 /ru 原样放行给 next-intl）。vitest 默认不设 flag。
describe("proxy: RU_PUBLIC 关 → /ru 前缀重定向剥除", () => {
  it("/ru → 重定向到 /", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    const res = proxy(req("/ru"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("/ru/today → /today（保留子路径）", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    const res = proxy(req("/ru/today"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/today");
  });

  it("/ru/me/settings?x=1 → /me/settings?x=1（保留 query）", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    const res = proxy(req("/ru/me/settings?x=1"));
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/me/settings");
    expect(loc.search).toBe("?x=1");
  });

  it("/russia（前缀近似但非 /ru 段）不被误伤剥成 /ssia", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "");
    const res = proxy(req("/russia"));
    const loc = res.headers.get("location");
    if (loc) expect(new URL(loc).pathname).not.toBe("/ssia");
  });
});

describe("proxy: RU_PUBLIC 开 → /ru 原样放行", () => {
  it("/ru 不被本闸 307 回 /（交给 next-intl）", () => {
    vi.stubEnv("NEXT_PUBLIC_RU_PUBLIC", "1");
    const res = proxy(req("/ru"));
    if (res.status === 307 || res.status === 308) {
      expect(new URL(res.headers.get("location")!).pathname).not.toBe("/");
    }
  });
});
