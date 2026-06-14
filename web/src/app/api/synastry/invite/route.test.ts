import { describe, it, expect } from "vitest";
import { POST as create, GET as status } from "./route";
import { POST as submit } from "./submit/route";

const jpost = (url: string, body: unknown, fn: (r: Request) => Promise<Response>) =>
  fn(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("synastry invite routes", () => {
  it("create → status(pending) → submit → status(ready) round-trip", async () => {
    const { token } = await (await jpost("http://x/api/synastry/invite", { inviterName: "阿星" }, create)).json();
    expect(token).toBeTruthy();

    const s1 = await (await status(new Request(`http://x/api/synastry/invite?token=${token}`))).json();
    expect(s1.ready).toBe(false);
    expect(s1.inviterName).toBe("阿星");

    const sub = await jpost("http://x/api/synastry/invite/submit", { token, name: "小鱼", chart: { ascSign: "双鱼", placements: [] } }, submit);
    expect(sub.status).toBe(200);

    const s2 = await (await status(new Request(`http://x/api/synastry/invite?token=${token}`))).json();
    expect(s2.ready).toBe(true);
    expect(s2.partner.name).toBe("小鱼");
    expect(s2.partner.chart.ascSign).toBe("双鱼");
  });

  it("status of unknown token → 404", async () => {
    expect((await status(new Request("http://x/api/synastry/invite?token=nope"))).status).toBe(404);
  });

  it("submit to unknown token → 404", async () => {
    const r = await jpost("http://x/api/synastry/invite/submit", { token: "nope", chart: {} }, submit);
    expect(r.status).toBe(404);
  });

  it("submit without chart → 400", async () => {
    const { token } = await (await jpost("http://x/api/synastry/invite", {}, create)).json();
    const r = await jpost("http://x/api/synastry/invite/submit", { token }, submit);
    expect(r.status).toBe(400);
  });
});
