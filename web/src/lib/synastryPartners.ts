// Saved synastry partners — the "已合的人" list (Unit G). Separate from the invite
// token list (synastryTokens.ts): tokens drive polling, this holds the partners
// who already filled in, so A can re-view or remove them. Stores the DERIVED
// partner chart only (no birthForm / PII), consistent with the app's local-first
// stance. Keyed by invite token (one saved partner per invite).
import type { RelType } from "@/lib/astro/synastry";

export const PARTNERS_KEY = "molly_syn_partners";
const CAP = 12;

export interface SavedPartner {
  token: string;
  name: string;
  chart: unknown; // derived chart (placements), never birthForm
  type?: RelType; // last relationship type A viewed for this partner
  total?: number; // last contributing score (D7: shown in the list)
  at: number;     // last updated (for ordering)
}

export function parsePartners(raw: string | null): SavedPartner[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((p): p is SavedPartner => !!p && typeof p.token === "string" && typeof p.name === "string" && !!p.chart);
  } catch {
    return [];
  }
}

// Merge a partner by token: keep existing fields, override with any provided.
// Newest-updated last, capped. Pure (caller injects `now` for deterministic tests).
export function withPartner(list: SavedPartner[], p: { token: string; name: string; chart: unknown; type?: RelType; total?: number }, now: number): SavedPartner[] {
  const prev = list.find((x) => x.token === p.token);
  const merged: SavedPartner = {
    token: p.token,
    name: p.name || prev?.name || "对方",
    chart: p.chart ?? prev?.chart,
    type: p.type ?? prev?.type,
    total: p.total ?? prev?.total,
    at: now,
  };
  return [...list.filter((x) => x.token !== p.token), merged].slice(-CAP);
}

export function readPartners(): SavedPartner[] {
  if (typeof window === "undefined") return [];
  return parsePartners(window.localStorage.getItem(PARTNERS_KEY));
}

export function upsertPartner(p: { token: string; name: string; chart: unknown; type?: RelType; total?: number }): SavedPartner[] {
  const next = withPartner(readPartners(), p, Date.now());
  if (typeof window !== "undefined") window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(next));
  return next;
}

export function removePartner(token: string): SavedPartner[] {
  const next = readPartners().filter((p) => p.token !== token);
  if (typeof window !== "undefined") window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(next));
  return next;
}
