import type { TesterPatch } from "@/lib/server/store";

// Client telemetry for the internal test. No-op unless NEXT_PUBLIC_MOLLY_TEST=1,
// so production and CI stay clean. Fire-and-forget; never throws.
const ON = process.env.NEXT_PUBLIC_MOLLY_TEST === "1";

function post(body: unknown) {
  if (!ON || typeof window === "undefined") return;
  try {
    fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function track(type: string, props?: Record<string, unknown>) {
  post({ type, props });
}

export function identify(patch: TesterPatch) {
  post({ identify: patch });
}

export const TEST_MODE = ON;
