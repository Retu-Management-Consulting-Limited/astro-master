import { track } from "@/lib/track";
import type { MeaningKey } from "./types";

// H1 (cadence): view + dwell over time → repetition/dwell-decay curves.
export function trackNarrativeView(p: { page: number; variant: string; weight: string }) {
  track("money_narrative_view", p);
}
export function trackDwell(p: { page: number; ms: number }) {
  track("money_narrative_dwell", p);
}
// H2 (learning data): how often meaning is corrected / engaged.
export function trackMeaningCorrected(p: { from: MeaningKey; to: MeaningKey }) {
  track("money_meaning_corrected", p);
}
export function trackEngage(p: { meaning: MeaningKey; surface: string }) {
  track("money_meaning_engage", p);
}
// H3 (真准 vs 巴纳姆): accuracy rating tagged with the A/B variant.
export function trackAccuracy(p: { rating: "good" | "meh" | "off"; variant: string }) {
  track("money_accuracy_rating", p);
}
