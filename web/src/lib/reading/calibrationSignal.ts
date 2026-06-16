import type { BirthInput } from "../astro/chart";
import type { LifeEvent, TimeBelief } from "../astro/rectify";
import { refine, seed } from "../astro/timeBelief";

// ── Phase 6 · 日常潜伏 (latent daily calibration) ─────────────────────────
// T1's daily loop is the feeding tube for the time-belief. Two drips run here,
// both pure logic so they can be TDD'd before any UI:
//
//   A · 平淡日备战糖收料 — when the belief is still wide and she has a half-filled
//       life event (a year with no month), a plain (平淡) day surfaces a 备战糖
//       card that asks her to remember the missing month. Completing it runs
//       refine(event) — real evidence, real narrowing.
//
//   B · 四角相关确认加权 — when she taps 准 on a verdict, we only feed the belief
//       if that verdict was ANGLE/house-related (its driving target is ASC/MC).
//       A pure-planet "准" says nothing about her birth *hour*, so it must NOT
//       move the belief — feeding it would be inventing precision (constitution
//       §8 真vs编: don't manufacture calibration she didn't actually give us).

// The verdict's driving target, as produced by reading/daily.ts dailyAspect.
// Only the two angles are sensitive to the birth hour.
const ANGLE_TARGETS = new Set(["ASC", "MC"]);

export function isAngleRelated(target: string): boolean {
  return ANGLE_TARGETS.has(target);
}

// Phase 6B. A confirmation only feeds the time-belief when it was about an angle.
// Pure-planet confirmations return the belief untouched (referentially equal).
export function confirmVerdict(prev: TimeBelief, target: string): TimeBelief {
  if (!isAngleRelated(target)) return prev; // 纯行星确认不喂时辰
  return refine(prev, { type: "confirm" });
}

// Phase 6A. Events the user gave a year for but never a month — the rectifier
// reads these at a mid-year stand-in, so completing one genuinely sharpens it.
export function halfFilledEvents(events: LifeEvent[]): LifeEvent[] {
  return events.filter((e) => e.month == null);
}

// Show the 备战糖 drip only when (1) the belief is still wide enough to be worth
// tightening and (2) there's actually a half-filled event to complete. Once the
// belief is sharp, stop nagging — don't drip for the sake of dripping.
const BAIT_CONFIDENCE_CEILING = 0.6;
export function shouldBaitForCompletion(belief: TimeBelief, events: LifeEvent[]): boolean {
  return belief.confidence < BAIT_CONFIDENCE_CEILING && halfFilledEvents(events).length > 0;
}

// Human-readable name of the event kind, for the bait copy.
const KIND_ZH: Record<LifeEvent["kind"], string> = {
  move: "搬家",
  career: "工作上的大变动",
  relationship: "那段感情",
  health: "身体上的那件事",
  family: "家里的那件事",
};

export interface EventCompletion {
  events: LifeEvent[];                 // events with the target's month filled in
  prompt: string;                      // the 备战糖 copy (names the event, asks the month)
  belief: (birth: BirthInput) => TimeBelief; // refined belief once completed (refine event)
}

// Complete a half-filled event with the remembered month, returning the updated
// event list, the bait copy, and a refresher that re-rectifies (refine event).
// The copy names the real event and asks for the missing month — it never claims
// certainty ("一定/肯定") and carries no amount/shame/gamble (money/guardrail-safe).
export function completeEvent(events: LifeEvent[], target: LifeEvent, month: number): EventCompletion {
  const completed = events.map((e) => (e === target ? { ...e, month } : e));
  const name = KIND_ZH[target.kind];
  const prompt = `想起来了吗——${name}大概是哪个月？补上月份，你的盘能更准一点。`;
  return {
    events: completed,
    prompt,
    belief: (birth: BirthInput) => seed(birth, completed),
  };
}

// Re-exported for callers that want the wide/sharp cut without importing rectify.
export { refine };
