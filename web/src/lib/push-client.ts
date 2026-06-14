"use client";
// Client-side Web Push helpers. No-ops gracefully when push isn't available
// (no SW, no PushManager, no VAPID public key, or permission denied) so the UI
// can always fall back to "reminders unavailable" without throwing.

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function pushAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID
  );
}

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushAvailable()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

// Returns true if now subscribed. Requests permission; false if denied/unavailable.
export async function enablePush(prefs?: { daily?: boolean }): Promise<boolean> {
  if (!pushAvailable()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID!) as BufferSource,
      }));
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs: prefs ?? { daily: true } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function disablePush(): Promise<void> {
  if (!pushAvailable()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}
