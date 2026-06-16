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

// ── 时辰侦探文案 (detective band copy) ────────────────────────────────────────
// The one user-facing line the "时辰侦探" surface (Phase 5 UI) renders under the
// 24h band: "已锁到 X 小时内 / 还没锁定". It is generated from the belief — never a
// fixed mad-lib — so it stays honest: a WIDE belief says we haven't locked the
// hour yet (no false precision); a sharp one names the real span we've narrowed to.
//
// Charter (charter v1.6 / 宪法 §5.2 镜子非算命) — this copy must:
//   • 真 via 对天象: it reports what her real events narrowed (a span of hours),
//     it never announces a single exact birth minute as fact.
//   • 不假装算命 / 不冒充: no 命中注定/预言/算准 framing — it's an inference that
//     gets sharper, explicitly still uncertain ("大概/还在收窄"), never god-view.
// The width comes straight from belief.topRange, so the string moves with the
// belief (registered as a dynamic surface in __guards__/content-freshness.test.ts).
export function detectiveBandCopy(belief: TimeBelief): string {
  const [lo, hi] = belief.topRange;
  const hours = ((hi - lo + 24) % 24) || 24; // wrap-aware span width in hours
  // Still wide → be honest that we haven't locked it; don't fake a window.
  if (belief.confidence < 0.15 || hours >= 20) {
    return "你的出生时辰还在收窄——多补一件人生大事，我就能锁得更准。";
  }
  return `照你说的那些大事，我大概把你的出生时辰锁到了 ${hours} 小时内——再补一件，还能更窄。`;
}

// Re-exported for callers that want the wide/sharp cut without importing rectify.
export { refine };
