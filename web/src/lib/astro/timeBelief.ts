import { rectify, type LifeEvent, type TimeBelief } from "./rectify";
import type { BirthInput } from "./chart";

export type { TimeBelief };

// ── Time-belief lifecycle ─────────────────────────────────────────────────
// `rectify` is the heavy, pure inference (events → distribution). `timeBelief`
// is the thin state layer the app talks to: seed it from onboarding, then refine
// it from the daily loop. The whole point of T3 is 越用越准 — the belief tightens
// as she lives in the app, so each *signal* she gives carries a calibrated weight
// (honesty footnote ③: behaviour + events > "准/不准" applause):
//
//   • event    — she added/completed a life event → re-run rectify (strongest).
//   • confirm  — she confirmed an ANGLE/house-related verdict → a real but small
//                nudge (the daily-loop drip; Phase 6 only fires this for 四角相关
//                judgements, pure-planet confirmations are NOT fed here).
//   • traitPick — an onboarding self-trait answer → the weakest starter nudge.
//
// Every path is clamped strictly below confidence=1. We tighten her belief; we
// never claim to *know* her birth minute (constitution §5.2 — mirror, not oracle).

export type BeliefSignal =
  | { type: "event"; birth: BirthInput; events: LifeEvent[] }
  | { type: "confirm" }
  | { type: "traitPick" };

// Same hard ceiling rectify uses — keep refine from ever creeping past it.
const CONFIDENCE_CEILING = 0.92;
const CONFIRM_GAIN = 0.02;   // one angle-related confirm: a real but small drip
const TRAIT_GAIN = 0.01;     // onboarding self-trait: the faintest starter

// Asymptotic bump toward (but never reaching) the ceiling. Repeated nudges give
// diminishing returns, so 200 confirms still can't manufacture certainty.
function nudge(confidence: number, gain: number): number {
  return confidence + gain * (CONFIDENCE_CEILING - confidence);
}

function withConfidence(prev: TimeBelief, confidence: number): TimeBelief {
  return {
    ...prev,
    confidence: Math.min(CONFIDENCE_CEILING, confidence),
    mode: confidence >= 0.5 ? "house" : "planet",
  };
}

export function seed(birth: BirthInput, events: LifeEvent[]): TimeBelief {
  return rectify(birth, events);
}

export function refine(prev: TimeBelief, signal: BeliefSignal): TimeBelief {
  switch (signal.type) {
    case "event":
      // A new/completed life event is hard evidence — re-rectify from scratch.
      return rectify(signal.birth, signal.events);
    case "confirm":
      // A small, distribution-preserving nudge: she confirmed an angle-related
      // judgement, so the hour she's locked to (topRange) doesn't move, only our
      // confidence in it ticks up.
      return withConfidence(prev, nudge(prev.confidence, CONFIRM_GAIN));
    case "traitPick":
      return withConfidence(prev, nudge(prev.confidence, TRAIT_GAIN));
  }
}
