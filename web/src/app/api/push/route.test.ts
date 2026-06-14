import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Mock the web-push transport; storage/logic run for real over the memory KV.
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn(async () => ({})), generateVAPIDKeys: vi.fn() },
}));
import webpush from "web-push";
import { POST as subscribe } from "./subscribe/route";
import { POST as unsubscribe } from "./unsubscribe/route";
import { GET as send } from "./send/route";
import { listSubscriptions } from "@/lib/server/push";

beforeAll(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
  process.env.PUSH_CRON_SECRET = "cron-secret-xyz";
});
beforeEach(() => vi.mocked(webpush.sendNotification).mockReset().mockResolvedValue({} as never));

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p", auth: "a" } });
const jpost = (body: unknown, fn: (r: Request) => Promise<Response>, mid = "m1") =>
  fn(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", cookie: `mid=${mid}` }, body: JSON.stringify(body) }));

describe("push subscribe/unsubscribe", () => {
  it("subscribe stores; unsubscribe removes", async () => {
    const e = `https://push.example/${Date.now()}-a`;
    expect((await jpost({ subscription: sub(e), prefs: { daily: true } }, subscribe)).status).toBe(200);
    expect((await listSubscriptions()).some((s) => s.subscription.endpoint === e)).toBe(true);

    expect((await jpost({ endpoint: e }, unsubscribe)).status).toBe(200);
    expect((await listSubscriptions()).some((s) => s.subscription.endpoint === e)).toBe(false);
  });

  it("subscribe without a subscription → 400", async () => {
    expect((await jpost({}, subscribe)).status).toBe(400);
  });
});

describe("push send (cron)", () => {
  const call = (qs: string) => send(new Request(`http://x/api/push/send${qs}`));

  it("rejects without the secret", async () => {
    expect((await call("")).status).toBe(401);
    expect((await call("?secret=wrong")).status).toBe(401);
  });

  it("with the secret, sends to every subscription", async () => {
    await jpost({ subscription: sub(`https://push.example/${Date.now()}-x`) }, subscribe, "mx");
    await jpost({ subscription: sub(`https://push.example/${Date.now()}-y`) }, subscribe, "my");
    const res = await call("?secret=cron-secret-xyz");
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.configured).toBe(true);
    expect(j.sent).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalled();
  });

  it("prunes dead (410) subscriptions", async () => {
    const dead = `https://push.example/${Date.now()}-dead`;
    await jpost({ subscription: sub(dead) }, subscribe, "md");
    vi.mocked(webpush.sendNotification).mockImplementation(async (s?: webpush.PushSubscription) => {
      if (s?.endpoint === dead) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return {} as never;
    });
    const j = await (await call("?secret=cron-secret-xyz")).json();
    expect(j.removed).toBeGreaterThanOrEqual(1);
    expect((await listSubscriptions()).some((s) => s.subscription.endpoint === dead)).toBe(false);
  });
});
