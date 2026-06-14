import "server-only";

// Server data layer for the internal test. Env-gated KV:
//   • UPSTASH_REDIS_REST_URL / _TOKEN  (Upstash standalone), or
//   • KV_REST_API_URL / KV_REST_API_TOKEN  (Vercel KV marketplace)
// When neither is set, falls back to an in-memory store so local dev and the
// test suite run with no external service (data is per-process, non-persistent).

type Json = unknown;

export interface KV {
  get(k: string): Promise<Json | null>;
  set(k: string, v: Json): Promise<void>;
  del(k: string): Promise<void>;
  lpush(k: string, v: Json): Promise<void>;
  lrange(k: string, start: number, stop: number): Promise<Json[]>;
  sadd(k: string, member: string): Promise<void>;
  smembers(k: string): Promise<string[]>;
}

function memoryKV(): KV {
  const kv = new Map<string, Json>();
  const lists = new Map<string, Json[]>();
  const sets = new Map<string, Set<string>>();
  return {
    async get(k) {
      return kv.has(k) ? kv.get(k)! : null;
    },
    async set(k, v) {
      kv.set(k, v);
    },
    async del(k) {
      kv.delete(k);
    },
    async lpush(k, v) {
      const l = lists.get(k) ?? [];
      l.unshift(v);
      lists.set(k, l);
    },
    async lrange(k, start, stop) {
      const l = lists.get(k) ?? [];
      const end = stop < 0 ? l.length + stop + 1 : stop + 1;
      return l.slice(start, end);
    },
    async sadd(k, member) {
      const s = sets.get(k) ?? new Set();
      s.add(member);
      sets.set(k, s);
    },
    async smembers(k) {
      return [...(sets.get(k) ?? [])];
    },
  };
}

let _kv: Promise<KV> | null = null;
function kv(): Promise<KV> {
  if (_kv) return _kv;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  _kv = (async () => {
    if (url && token) {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url, token });
      return {
        get: (k) => redis.get(k) as Promise<Json | null>,
        set: async (k, v) => {
          await redis.set(k, v as never);
        },
        del: async (k) => {
          await redis.del(k);
        },
        lpush: async (k, v) => {
          await redis.lpush(k, v as never);
        },
        lrange: (k, s, e) => redis.lrange(k, s, e) as Promise<Json[]>,
        sadd: async (k, m) => {
          await redis.sadd(k, m);
        },
        smembers: (k) => redis.smembers(k) as Promise<string[]>,
      } satisfies KV;
    }
    return memoryKV();
  })();
  return _kv;
}

// Shared KV handle for other server modules (e.g. auth).
export function getKV(): Promise<KV> {
  return kv();
}

export const KV_ENABLED = !!(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
);

// ---- readings cache (a chart's reading is stable) ----
export async function cacheGet(key: string): Promise<Json | null> {
  return (await kv()).get(`rc:${key}`);
}
export async function cacheSet(key: string, value: Json): Promise<void> {
  await (await kv()).set(`rc:${key}`, value);
}

// ---- geocode cache (coords for an offline-miss city are stable) ----
export async function geoCacheGet(key: string): Promise<Json | null> {
  return (await kv()).get(`gc:${key}`);
}
export async function geoCacheSet(key: string, value: Json): Promise<void> {
  await (await kv()).set(`gc:${key}`, value);
}

// ---- internal-test telemetry ----
export interface TesterPatch {
  name?: string;
  ascSign?: string;
  nickname?: string;
  chartSig?: string;
  lastSeen?: number;
}

export async function upsertTester(id: string, patch: TesterPatch): Promise<void> {
  const k = await kv();
  const prev = ((await k.get(`tester:${id}`)) as Record<string, unknown> | null) ?? { id, firstSeen: Date.now() };
  await k.set(`tester:${id}`, { ...prev, ...patch, lastSeen: Date.now() });
  await k.sadd("testers", id);
}

export async function logEvent(testerId: string, type: string, props?: Record<string, unknown>): Promise<void> {
  await (await kv()).lpush(`events:${testerId}`, { type, ts: Date.now(), ...props });
}

export async function addFeedback(fb: { testerId: string; text: string; page?: string }): Promise<void> {
  await (await kv()).lpush("feedback", { ...fb, ts: Date.now() });
}

// ---- read side (for admin/export) ----
export async function listTesterIds(): Promise<string[]> {
  return (await kv()).smembers("testers");
}
export async function getTester(id: string): Promise<Json | null> {
  return (await kv()).get(`tester:${id}`);
}
export async function getEvents(id: string, limit = 200): Promise<Json[]> {
  return (await kv()).lrange(`events:${id}`, 0, limit - 1);
}
export async function getFeedback(limit = 200): Promise<Json[]> {
  return (await kv()).lrange("feedback", 0, limit - 1);
}
