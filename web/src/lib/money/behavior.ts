import { MEANING_KEYS, type MeaningKey, type Meaning, type MoneyPersona } from "./types";

export interface BehaviorSignal {
  kind: "correct" | "engage" | "phrase"; // explicit / implicit-click / chat-language
  meaning?: MeaningKey;
  weight: number; // caller-supplied magnitude (e.g. dwell-derived)
}

export interface MeaningBelief {
  scores: Record<MeaningKey, number>;
  signals: number; // count of signals folded in (drives confidence)
  confidence: number; // 0..1
}

const KIND_WEIGHT: Record<BehaviorSignal["kind"], number> = { correct: 3, engage: 0.6, phrase: 1 };

const OPPOSED: [MeaningKey, MeaningKey][] = [
  ["freedom", "security"],
  ["status", "care"],
  ["control", "worth"],
];

function confidenceFrom(scores: Record<MeaningKey, number>, signals: number): number {
  const vals = MEANING_KEYS.map((k) => scores[k]);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const top = Math.max(...vals);
  const sep = top / total; // how dominant the leader is
  // more signals + clearer leader → higher confidence, capped at 1
  return Math.min(1, sep * 0.6 + (Math.min(signals, 10) / 10) * 0.4);
}

export function initBelief(persona: MoneyPersona): MeaningBelief {
  // seed from chart scores so day-1 belief == chart persona
  const scores = { ...persona.scores };
  return { scores, signals: 0, confidence: confidenceFrom(scores, 0) };
}

export function refineMeaning(prev: MeaningBelief, sig: BehaviorSignal): MeaningBelief {
  const scores = { ...prev.scores };
  if (sig.meaning) scores[sig.meaning] += KIND_WEIGHT[sig.kind] * sig.weight;
  const signals = prev.signals + 1;
  return { scores, signals, confidence: confidenceFrom(scores, signals) };
}

export function beliefToMeaning(b: MeaningBelief): Meaning {
  const ordered = [...MEANING_KEYS].sort(
    (a, z) => b.scores[z] - b.scores[a] || MEANING_KEYS.indexOf(a) - MEANING_KEYS.indexOf(z),
  );
  const [primary, secondary] = ordered;
  const relation = OPPOSED.some(
    ([x, y]) => (x === primary && y === secondary) || (y === primary && x === secondary),
  )
    ? "tension"
    : "reinforce";
  return { primary, secondary, relation };
}
