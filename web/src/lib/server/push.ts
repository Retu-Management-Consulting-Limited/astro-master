import "server-only";
import webpush from "web-push";
import { createHash } from "node:crypto";
import { getKV } from "./store";

// Web Push subscriptions live in KV: a set of endpoints + one record each.
// Config (VAPID keys) is read lazily so the module loads fine without keys
// (storage works; only actual sending needs them).

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface StoredSub {
  subscription: PushSubscriptionJSON;
  identity: string;
  prefs?: { daily?: boolean };
  ts: number;
}

const SET = "push:endpoints";
const hash = (s: string) => createHash("sha1").update(s).digest("hex");
const subKey = (endpoint: string) => `pushsub:${hash(endpoint)}`;

export function pushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@vapeincity.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidSet = true;
}

export async function saveSubscription(subscription: PushSubscriptionJSON, identity: string, prefs?: StoredSub["prefs"]): Promise<void> {
  if (!subscription?.endpoint) return;
  const kv = await getKV();
  await kv.set(subKey(subscription.endpoint), { subscription, identity, prefs, ts: Date.now() } satisfies StoredSub);
  await kv.sadd(SET, subscription.endpoint);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  const kv = await getKV();
  await kv.del(subKey(endpoint));
  await kv.srem(SET, endpoint);
}

export async function listSubscriptions(): Promise<StoredSub[]> {
  const kv = await getKV();
  const endpoints = await kv.smembers(SET);
  const subs = await Promise.all(endpoints.map((e) => kv.get(subKey(e)) as Promise<StoredSub | null>));
  // Drop malformed/partial records defensively — a corrupt KV entry must never
  // crash the daily fan-out.
  return subs.filter((s): s is StoredSub => !!s?.subscription?.endpoint);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}
export interface SendResult {
  configured: boolean;
  sent: number;
  removed: number;
  failed: number;
}

// Send a payload to every subscription. Dead subscriptions (404/410) are pruned.
export async function sendToAll(payload: PushPayload): Promise<SendResult> {
  if (!pushConfigured()) return { configured: false, sent: 0, removed: 0, failed: 0 };
  ensureVapid();
  const subs = await listSubscriptions();
  const data = JSON.stringify(payload);
  let sent = 0,
    removed = 0,
    failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription as webpush.PushSubscription, data);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await removeSubscription(s.subscription.endpoint);
        removed++;
      } else {
        failed++;
      }
    }
  }
  return { configured: true, sent, removed, failed };
}

// Deterministic daily nudge (no LLM cost in cron).
export const DAILY_PAYLOAD: PushPayload = {
  title: "Molly",
  body: "今天有句话，我想单独跟你说 →",
  url: "/today",
};
