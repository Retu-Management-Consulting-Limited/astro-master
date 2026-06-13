"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "./store";

// Chart-gated pages (today/chart/chat/me/wealth/synastry/share) use this.
// Redirects to /input ONLY after the persisted store has rehydrated — so a
// returning PWA user isn't bounced to /input on the first client frame before
// localStorage is read. Pages should `if (!ready || !chart) return null` to
// keep the server HTML and first client paint in sync (both render nothing).
export function useChartGuard() {
  const router = useRouter();
  const chart = useFunnel((s) => s.chart);
  const hasHydrated = useFunnel((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !chart) router.replace("/input");
  }, [hasHydrated, chart, router]);

  return { chart, ready: hasHydrated };
}
