"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "./store";
import { isFullChart } from "./astro/chart-validate";

// Chart-gated pages (today/chart/chat/me/wealth/synastry/share) use this.
// Returns a chart ONLY when it's structurally complete (isFullChart) — a dirty
// or half-written persisted chart (placements null/[], missing Sun/Moon, etc.)
// is treated as "no chart" so pages fall back to /input instead of crashing
// downstream (`.find('Jupiter')!.lon` and friends). Redirect waits for BOTH:
//   • hasHydrated — localStorage rehydrated (don't bounce a PWA user on frame 1)
//   • authChecked — AuthHydration finished its /api/auth/me reconcile, so a
//     returning user on a NEW device (session cookie, empty localStorage) gets
//     their account chart pulled down BEFORE we'd wrongly redirect to /input.
export function useChartGuard() {
  const router = useRouter();
  const rawChart = useFunnel((s) => s.chart);
  const hasHydrated = useFunnel((s) => s.hasHydrated);
  const authChecked = useFunnel((s) => s.authChecked);

  const chart = isFullChart(rawChart) ? rawChart : undefined;
  const ready = hasHydrated && authChecked;

  useEffect(() => {
    if (ready && !chart) router.replace("/input");
  }, [ready, chart, router]);

  return { chart, ready };
}
