import "server-only";
import { getKV } from "./store";

// Fixed-window rate limiter over the KV's atomic incr. Each rule maps to a key
// rl:<scope>:<id>:<bucket> where bucket = floor(now/windowMs); old buckets are
// dead keys (never read again). Limits are env-configurable with sane defaults
// and can be disabled (RL_DISABLED=1) for tests/dev.

export interface Rule {
  scope: string;
  limit: number;
  windowMs: number;
}
export interface RateResult {
  ok: boolean;
  retryAfterSec?: number;
}

const num = (env: string | undefined, dflt: number) => {
  const n = Number(env);
  return Number.isFinite(n) && n > 0 ? n : dflt;
};

const MIN = 60_000;
const HOUR = 3600_000;
const DAY = 86_400_000;

export const RULES = {
  reading: (): Rule[] => [{ scope: "read", limit: num(process.env.RL_READ_DAY, 30), windowMs: DAY }],
  chat: (): Rule[] => [
    { scope: "chat:h", limit: num(process.env.RL_CHAT_HOUR, 60), windowMs: HOUR },
    { scope: "chat:d", limit: num(process.env.RL_CHAT_DAY, 300), windowMs: DAY },
  ],
  // Auth: throttle brute-force / mass account creation (M2).
  auth: (): Rule[] => [
    { scope: "auth:m", limit: num(process.env.RL_AUTH_MIN, 10), windowMs: MIN },
    { scope: "auth:h", limit: num(process.env.RL_AUTH_HOUR, 60), windowMs: HOUR },
  ],
  // Geocode: each miss can hit external Nominatim — cap per identity (N1).
  geocode: (): Rule[] => [{ scope: "geo:m", limit: num(process.env.RL_GEO_MIN, 30), windowMs: MIN }],
  // Synastry invite creation (M5).
  invite: (): Rule[] => [{ scope: "inv:h", limit: num(process.env.RL_INVITE_HOUR, 30), windowMs: HOUR }],
};

const DISABLED = () => process.env.RL_DISABLED === "1";

// Increment all rules' counters; block if ANY exceeds its limit.
export async function rateLimit(id: string, rules: Rule[], nowMs = Date.now()): Promise<RateResult> {
  if (DISABLED()) return { ok: true };
  const kv = await getKV();
  let worst = 0; // largest remaining window (sec) among exceeded rules
  for (const r of rules) {
    const bucket = Math.floor(nowMs / r.windowMs);
    const count = await kv.incr(`rl:${r.scope}:${id}:${bucket}`);
    if (count > r.limit) {
      const retry = Math.ceil(((bucket + 1) * r.windowMs - nowMs) / 1000);
      worst = Math.max(worst, retry);
    }
  }
  return worst > 0 ? { ok: false, retryAfterSec: worst } : { ok: true };
}
