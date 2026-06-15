import { describe, it, expect } from "vitest";
import { POST as create, GET as status } from "./route";
import { POST as submit } from "./submit/route";

const jpost = (url: string, body: unknown, fn: (r: Request) => Promise<Response>) =>
  fn(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

// A structurally valid chart (isFullChart: non-empty placements incl Sun+Moon,
// aspects array, ascSign).
const validChart = {
  ascSign: "双鱼",
  ascSignIndex: 11,
  asc: 1,
  mc: 1,
  aspects: [],
  placements: [
    { body: "Sun", sign: "双子", house: 4, lon: 80, degInSign: 20, signIndex: 2 },
    { body: "Moon", sign: "巨蟹", house: 5, lon: 100, degInSign: 10, signIndex: 3 },
  ],
};

describe("synastry invite routes", () => {
  it("create → status(pending) → submit → status(ready) round-trip", async () => {
    const { token } = await (await jpost("http://x/api/synastry/invite", { inviterName: "阿星" }, create)).json();
    expect(token).toBeTruthy();

    const s1 = await (await status(new Request(`http://x/api/synastry/invite?token=${token}`))).json();
    expect(s1.ready).toBe(false);
    expect(s1.inviterName).toBe("阿星");

    const sub = await jpost("http://x/api/synastry/invite/submit", { token, name: "小鱼", chart: validChart }, submit);
    expect(sub.status).toBe(200);

    const s2 = await (await status(new Request(`http://x/api/synastry/invite?token=${token}`))).json();
    expect(s2.ready).toBe(true);
    expect(s2.partner.name).toBe("小鱼");
    expect(s2.partner.chart.ascSign).toBe("双鱼");
  });

  it("status of unknown token → 404", async () => {
    expect((await status(new Request("http://x/api/synastry/invite?token=nope"))).status).toBe(404);
  });

  it("submit to unknown token (valid chart) → 404", async () => {
    const r = await jpost("http://x/api/synastry/invite/submit", { token: "nope", chart: validChart }, submit);
    expect(r.status).toBe(404);
  });

  it("submit without token → 400", async () => {
    const r = await jpost("http://x/api/synastry/invite/submit", { chart: validChart }, submit);
    expect(r.status).toBe(400);
  });

  it("submit with invalid/empty chart → 400 (M3/M7: never persist a crashing partner)", async () => {
    const { token } = await (await jpost("http://x/api/synastry/invite", {}, create)).json();
    for (const bad of [{}, "hello", 123, [], { placements: null }, { placements: [] }, { placements: [{ body: "Sun" }] }]) {
      const r = await jpost("http://x/api/synastry/invite/submit", { token, chart: bad }, submit);
      expect(r.status).toBe(400);
    }
  });

  it("GET does NOT leak the partner's birthForm PII (M4)", async () => {
    const { token } = await (await jpost("http://x/api/synastry/invite", {}, create)).json();
    await jpost("http://x/api/synastry/invite/submit", { token, name: "小鱼", chart: validChart, birthForm: { date: "1995-05-05", time: "12:00", country: "中国", city: "北京" } }, submit);
    const s = await (await status(new Request(`http://x/api/synastry/invite?token=${token}`))).json();
    expect(s.partner.chart).toBeTruthy(); // chart still exposed (needed for synastry)
    expect(s.partner.name).toBe("小鱼");
    expect(s.partner.birthForm).toBeUndefined(); // PII stripped
  });
});
