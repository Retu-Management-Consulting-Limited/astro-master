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
      const me = await apiMe();
      if (!me) return; // not logged in → nothing to reconcile
      const local = useFunnel.getState();
      if (local.chart) {
        apiSync(snapshotOf(local));
      } else if (me.profile?.chart) {
        useFunnel.getState().loadServer(me.profile);
      }
    })();
  }, [hasHydrated]);

  return null;
}
