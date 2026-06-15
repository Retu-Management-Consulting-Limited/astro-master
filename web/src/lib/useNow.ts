"use client";
import { useEffect, useState } from "react";

// Client-side "now" (device LOCAL time) that REFRESHES when the app is re-shown:
// visibilitychange (PWA resume / tab switch), focus, and pageshow (bfcache). A
// long-lived installed PWA used to freeze on the day it was first opened because
// `new Date()` was read once at mount and never again — so /today / /wealth
// wouldn't roll over to the new local day. This re-reads it on every resume.
//
// Returns null until mounted (so SSR and the first client paint agree).
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  return now;
}
