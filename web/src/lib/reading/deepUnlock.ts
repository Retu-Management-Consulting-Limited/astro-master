// #2 honest gating (constitution §3.6) — the 「更深一层」 is REAL content, gated two
// honest ways: ① 越用越准 (§3.2): free once 懂你度 hits the threshold; ② a paywall
// slot (variabl-ready, payment not wired yet). No 编 (§8): the free path genuinely
// delivers at the threshold, the paywall is clearly marked, nothing is faked.
//
// Threshold = 72, chosen so the free path is REACHABLE for EVERY user (§4.5 no empty
// promise): an unknown-birth-time user's 懂你度 maxes ~78 (no exact-time +12 bonus), so
// 80 would have locked them out of the free unlock forever. 72 is earned (≈a week of
// real check-ins/hits) yet attainable by all.
export const DEEP_UNLOCK_AT = 72;

export interface DeepUnlock {
  unlocked: boolean;
  at: number; // the 懂你度 threshold for the free unlock
  toGo: number; // points of 懂你度 still needed (0 once unlocked)
}

export function deepUnlock(understanding: number): DeepUnlock {
  const u = Math.round(understanding);
  return { unlocked: u >= DEEP_UNLOCK_AT, at: DEEP_UNLOCK_AT, toGo: Math.max(0, DEEP_UNLOCK_AT - u) };
}
