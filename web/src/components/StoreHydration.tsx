"use client";
import { useEffect } from "react";
import { useFunnel } from "@/lib/store";

// Triggers the persisted store's rehydration on the client after mount. The
// store uses skipHydration so this is the single point where localStorage is
// read — keeping SSR output and the first client render identical.
export function StoreHydration() {
  useEffect(() => {
    useFunnel.persist.rehydrate();
  }, []);
  return null;
}
