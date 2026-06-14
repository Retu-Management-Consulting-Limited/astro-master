import { describe, it, expect } from "vitest";
import { POST as register } from "./register/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";
import { POST as sync } from "./sync/route";
import { POST as del } from "./delete/route";

let n = 0;
const email = () => `r${n++}-${Date.now()}@test.dev`;

const jsonReq = (body: unknown, token?: string) =>
  new Request("http://x", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { cookie: `msid=${token}` } : {}) },
    body: JSON.stringify(body),
  });
const getReq = (token?: string) => new Request("http://x", token ? { headers: { cookie: `msid=${token}` } } : {});

function tokenFrom(res: Response): string | undefined {
  const sc = res.headers.get("set-cookie") ?? "";
  const m = sc.match(/msid=([^;]*)/);
  return m && m[1] ? m[1] : undefined;
}

describe("auth routes — register", () => {
  it("registers, sets session cookie, /me returns email + profile", async () => {
    const e = email();
    const res = await register(jsonReq({ email: e, password: "password1", profile: { nickname: "阿星" } }));
    expect(res.status).toBe(201);
    const token = tokenFrom(res);
    expect(token).toBeTruthy();

    const meRes = await me(getReq(token));
    expect(meRes.status).toBe(200);
    const j = await meRes.json();
    expect(j.email).toBe(e.toLowerCase());
    expect(j.profile.nickname).toBe("阿星");
  });

  it("duplicate email → 409", async () => {
    const e = email();
    await register(jsonReq({ email: e, password: "password1" }));
    expect((await register(jsonReq({ email: e, password: "password2" }))).status).toBe(409);
  });

  it("weak password → 400, bad email → 400", async () => {
    expect((await register(jsonReq({ email: email(), password: "short" }))).status).toBe(400);
    expect((await register(jsonReq({ email: "notanemail", password: "password1" }))).status).toBe(400);
  });
});

describe("auth routes — login & me", () => {
  it("correct login → 200 + profile; wrong password → 401", async () => {
    const e = email();
    await register(jsonReq({ email: e, password: "password1", profile: { nickname: "云" } }));

    const ok = await login(jsonReq({ email: e, password: "password1" }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).profile.nickname).toBe("云");

    expect((await login(jsonReq({ email: e, password: "WRONG" }))).status).toBe(401);
  });

  it("/me without cookie → 401", async () => {
    expect((await me(getReq())).status).toBe(401);
  });
});

describe("auth routes — logout revokes server-side", () => {
  it("after logout the old token no longer authenticates", async () => {
    const e = email();
    const reg = await register(jsonReq({ email: e, password: "password1" }));
    const token = tokenFrom(reg);
    expect((await me(getReq(token))).status).toBe(200);

    const out = await logout(getReq(token) as Request);
    expect(out.status).toBe(200);
    // session revoked → same token string is now invalid
    expect((await me(getReq(token))).status).toBe(401);
  });
});

describe("auth routes — sync persists snapshot", () => {
  it("sync writes profile that /me then returns", async () => {
    const e = email();
    const token = tokenFrom(await register(jsonReq({ email: e, password: "password1" })));
    const s = await sync(jsonReq({ profile: { nickname: "改了", chart: { ascSign: "巨蟹" } } }, token));
    expect(s.status).toBe(200);
    const j = await (await me(getReq(token))).json();
    expect(j.profile.nickname).toBe("改了");
    expect(j.profile.chart.ascSign).toBe("巨蟹");
  });

  it("sync without auth → 401", async () => {
    expect((await sync(jsonReq({ profile: {} }))).status).toBe(401);
  });
});

describe("auth routes — delete", () => {
  it("delete wipes data; /me → 401; email reusable", async () => {
    const e = email();
    const token = tokenFrom(await register(jsonReq({ email: e, password: "password1" })));
    expect((await del(getReq(token) as Request)).status).toBe(200);
    expect((await me(getReq(token))).status).toBe(401);
    // email free again
    expect((await register(jsonReq({ email: e, password: "password1" }))).status).toBe(201);
  });
});
