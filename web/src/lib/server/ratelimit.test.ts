import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rateLimit, type Rule } from "./ratelimit";

// This suite tests the limiter itself → enable it (vitest defaults RL_DISABLED=1).
beforeAll(() => { process.env.RL_DISABLED = "0"; });
afterAll(() => { process.env.RL_DISABLED = "1"; });

const uid = () => `t${Math.floor(performance.now() * 1000)}-${process.hrtime.bigint()}`;
const rule = (scope: string, limit: number, windowMs = 3600_000): Rule => ({ scope, limit, windowMs });

describe("rateLimit", () => {
  it("allows up to the limit, blocks beyond, within a window", async () => {
    const id = uid();
    const r = [rule("x", 3)];
    expect((await rateLimit(id, r)).ok).toBe(true); // 1
    expect((await rateLimit(id, r)).ok).toBe(true); // 2
    expect((await rateLimit(id, r)).ok).toBe(true); // 3
    const blocked = await rateLimit(id, r); // 4
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates different identities", async () => {
    const a = uid();
    const b = uid();
    const r = [rule("y", 1)];
    expect((await rateLimit(a, r)).ok).toBe(true);
    expect((await rateLimit(a, r)).ok).toBe(false); // a exhausted
    expect((await rateLimit(b, r)).ok).toBe(true); // b independent
  });

  it("different scopes are independent", async () => {
    const id = uid();
    expect((await rateLimit(id, [rule("s1", 1)])).ok).toBe(true);
    expect((await rateLimit(id, [rule("s1", 1)])).ok).toBe(false);
    expect((await rateLimit(id, [rule("s2", 1)])).ok).toBe(true); // separate scope
  });

  it("blocks if ANY rule in the set exceeds", async () => {
    const id = uid();
    const rules = [rule("hi", 100), rule("lo", 1)];
    expect((await rateLimit(id, rules)).ok).toBe(true);
    expect((await rateLimit(id, rules)).ok).toBe(false); // lo exhausted
  });

  it("separate time buckets reset the count", async () => {
    const id = uid();
    const w = 1000;
    const r = [rule("b", 1, w)];
    const t0 = 10_000_000;
    expect((await rateLimit(id, r, t0)).ok).toBe(true);
    expect((await rateLimit(id, r, t0)).ok).toBe(false); // same bucket
    expect((await rateLimit(id, r, t0 + w)).ok).toBe(true); // next bucket
  });
});
