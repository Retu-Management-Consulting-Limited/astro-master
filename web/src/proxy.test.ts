import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(`https://x.test${path}`), { headers });
}

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
