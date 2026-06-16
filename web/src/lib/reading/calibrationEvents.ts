import type { LifeEvent } from "../astro/rectify";

// ── Onboarding "人生大事" catalog (design/22 · T-Q1:B) ────────────────────────
// The five life events the user multi-selects, each carrying the year/age the
// user pins on a slider. These are fed to rectify() (via seed) to back-infer the
// birth hour from where slow transits touched the natal angles — "真 via 对天象"
// (constitution §5.2: a mirror, not a fortune-machine). Each chip maps 1:1 to a
// LifeEvent.kind the rectifier understands.

export interface EventOption {
  kind: LifeEvent["kind"];
  label: string;
}

export const EVENT_OPTIONS: EventOption[] = [
  { kind: "move", label: "搬到新城市" },
  { kind: "career", label: "换了行业" },
  { kind: "relationship", label: "一段重要感情" },
  { kind: "health", label: "大病 / 手术" },
  { kind: "family", label: "结婚 / 生子" },
];

// The age slider runs over a plausible adult-event band; the midpoint is the
// default so a one-tap answer still lands somewhere reasonable (design/22 shows
// 18 … ~26 … 40). The user drags to the age the event happened.
export const AGE_MIN = 6;
export const AGE_MAX = 50;
export const AGE_DEFAULT = 26;

// A selected chip + the age the user dragged to. Age is converted to a calendar
// year via the natal birth year. We leave `month` unset (half-filled event) on
// purpose: the daily-loop 备战糖 (Phase 6) fills the month later via refine(),
// and rectify reads a half-filled event mid-year — so completing it genuinely
// shifts the signal rather than being a no-op.
export interface EventSelection {
  kind: LifeEvent["kind"];
  age: number;
}

// Convert the onboarding selections into LifeEvent[] for seed()/rectify().
// birthYear comes from the natal BirthInput already in the store. We clamp age
// to the slider band and never emit an event before birth year.
export function eventsFromSelections(birthYear: number, selections: EventSelection[]): LifeEvent[] {
  return selections.map((s) => {
    const age = Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(s.age)));
    return { kind: s.kind, year: birthYear + age };
  });
}
