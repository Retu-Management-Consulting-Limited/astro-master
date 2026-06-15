"use client";
import { useEffect, useRef } from "react";
import { useFunnel, snapshotOf } from "@/lib/store";
import { apiMe, apiSync } from "@/lib/auth-client";

// On app open, reconcile the logged-in account with the local funnel store.
// Runs once, AFTER localStorage rehydration (hasHydrated), so we never race the
// persisted chart. Local-first: if this device already has a chart we push it up
// (the user may have edited offline); otherwise we pull the account's chart down
// so a returning user on a NEW device sees their reading instead of /input.
export function AuthHydration() {
  const hasHydrated = useFunnel((s) => s.hasHydrated);
  const ran = useRef(false);

  useEffect(() => {
    if (!hasHydrated || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        // Bound the reconcile so a stalled /api/auth/me never strands gated
        // pages (guard waits on authChecked). 3s then proceed as logged-out.
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), 3000));
        const me = await Promise.race([apiMe(), timeout]);
        if (me) {
          const local = useFunnel.getState();
          if (local.chart) {
            apiSync(snapshotOf(local));
          } else if (me.profile?.chart) {
            useFunnel.getState().loadServer(me.profile);
          }
        }
      } finally {
        // Unblock the chart guard whether or not a user/chart was found.
        useFunnel.getState().setAuthChecked(true);
      }
    })();
  }, [hasHydrated]);

  return null;
}
