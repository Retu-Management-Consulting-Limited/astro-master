import { describe, it, expect } from "vitest";
import { resolveIdentity } from "./identity";
import { createUser, createSession } from "./auth";

const req = (headers: Record<string, string>) => new Request("http://x", { headers });

describe("resolveIdentity", () => {
  it("prefers logged-in user", async () => {
    const u = await createUser(`id-${Date.now()}@test.dev`, "password1");
    const token = await createSession(u.id);
    expect(await resolveIdentity(req({ cookie: `msid=${token}; mid=abc` }))).toBe(`u:${u.id}`);
  });

  it("falls back to the mid tester cookie", async () => {
    expect(await resolveIdentity(req({ cookie: "mid=tester-123" }))).toBe("m:tester-123");
  });

  it("then to client IP (first x-forwarded-for)", async () => {
    expect(await resolveIdentity(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("ip:1.2.3.4");
  });

  it("anon when nothing identifies the caller", async () => {
    expect(await resolveIdentity(req({}))).toBe("anon");
  });
});
