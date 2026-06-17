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

// ── T4 Phase 5 · 身心症状自证 → 喂时辰校准 ─────────────────────────────────────
// 身心判词里有两类"她答得了的"症状自证微互动（见 bodyVerdict）：
//
//   • selfCheck（该歇日）：今天月亮结到她本命某点，问她"身体哪块先喊累"。这个判词
//     的驱动点 = 当天月亮 aspect 的 target（dailyAspect.target）。只有当那个 target
//     是四角(ASC/MC)时，她的"准"才对出生时辰说了话——四角随时辰摆 ~1°/4min。
//   • zone（身体留意区·稀有）：由慢星长压【六宫宫位 / 六宫宫主】触发。六宫宫位与宫主
//     都从上升推出，所以 zone 这类确认天然是"六宫/时辰相关"——必喂。
//
// 她一答 → ① 喂身心自我模型（产品侧记录，这里只产判定 + 回话），② 若信号是四角/六宫
// 相关，顺手 refine(confirm) 喂 timeBelief（接 calibrationSignal 同一条收窄管线）。
// 纯行星相关的身心确认绝不喂时辰：今天月亮只是结到她的月亮/火星，这对她的"出生*时辰*"
// 没说什么，喂它就是编造她没真给的精度（宪法 §8 真vs编，与 confirmVerdict 同源）。
export type BodySignalSource =
  | { kind: "zone" }                  // 身体留意区：六宫宫位/宫主驱动 → 天然时辰相关
  | { kind: "selfCheck"; target: string }; // 症状自证：驱动点 = 当天月亮 aspect.target

// 这条身心确认对出生时辰是否是真证据？zone 永远是（六宫=上升推出）；selfCheck 只在
// 月亮今天结的是四角(ASC/MC)时才是（复用 isAngleRelated 同一道四角门）。
export function isBodySignalAngleRelated(source: BodySignalSource): boolean {
  if (source.kind === "zone") return true; // 六宫宫位/宫主 → 时辰敏感
  return isAngleRelated(source.target);    // 症状自证：四角 target 才喂
}

// 她确认了一条身心信号：四角/六宫相关 → refine(confirm) 喂时辰（与 confirmVerdict 同一
// 个 distribution-preserving 微升、asymptotic 封顶）；纯行星相关 → 原样返回（referentially
// equal，belief 一字不动）。喂身心自我模型本身是产品侧副作用，这里只负责时辰这条线。
export function confirmBodySignal(prev: TimeBelief, source: BodySignalSource): TimeBelief {
  if (!isBodySignalAngleRelated(source)) return prev; // 纯行星身心确认不喂时辰
  return refine(prev, { type: "confirm" });
}

// 从一条身心判词的自证面构造 BodySignalSource：身体留意区(zone) → {kind:'zone'}（必喂）；
// 症状自证(selfCheck) → 带上它的星象驱动点 target（四角才喂）。给 UI 一条干净的接线：
// 拿 bodyVerdict 的 zone/selfCheck 直接喂这里，不必在组件里重复判定四角门。
export function selfCheckSource(target: string): BodySignalSource {
  return { kind: "selfCheck", target };
}
export function zoneSource(): BodySignalSource {
  return { kind: "zone" };
}

// 她一答即「被看穿」的回话——确认收到她指认的那块体感（喂身心模型的用户侧回执）。
// 说倾向不说病：只复述她自证得了的"区域/体感"，绝不升格成病种断言（§6.4/§9）。
// 过 money/guardrail（不报数字 / 不羞辱 / 不怂恿赌性）。
export function bodySignalAck(region: string): string {
  return `${region}这块，我记下了——这阵子多搭把手照顾它，身体的话我陪你一起听。`;
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
// The string moves with the belief on BOTH axes it actually carries — the WINDOW
// (topRange, where the band sits on the clock) and the MODE (planet vs house, the
// granularity the belief currently supports). Two beliefs that happen to share a
// span width but sit at different clock positions, or that differ only by crossing
// the house threshold, MUST render different copy — otherwise the surface collapses
// where the belief moved (registered, strong-form, in
// __guards__/content-freshness.test.ts: byte-identical copy for distinct beliefs is
// the exact 「换了一belief还一样」 false-green the registry exists to catch).
//
// We render the real wrap-aware window ("21 点到次日 11 点"), not just its width, so
// b=[15,5] and b=[21,11] never read the same. It stays charter-clean: a hedged span,
// never a pinned minute (§5.2/B2). The mode word reflects the belief's own granularity
// — once confidence crosses the house threshold the band is precise enough to talk in
// 宫位 (house) rather than only 行星 (planet) terms; that flip is belief-driven, real.
function fmtHour(h: number): string {
  return `${((h % 24) + 24) % 24} 点`;
}
function fmtWindow([lo, hi]: [number, number]): string {
  // wrap-aware: if the band crosses midnight, say 次日 so the window is unambiguous.
  const wraps = ((hi - lo + 24) % 24) !== hi - lo;
  return wraps ? `${fmtHour(lo)}到次日 ${fmtHour(hi)}` : `${fmtHour(lo)}到 ${fmtHour(hi)}`;
}
export function detectiveBandCopy(belief: TimeBelief): string {
  const [lo, hi] = belief.topRange;
  const hours = ((hi - lo + 24) % 24) || 24; // wrap-aware span width in hours
  // Still wide → be honest that we haven't locked it; don't fake a window.
  if (belief.confidence < 0.15 || hours >= 20) {
    return "你的出生时辰还在收窄——多补一件人生大事，我就能锁得更准。";
  }
  // The band is precise enough to read by 宫位 (house) once confidence has crossed
  // the threshold; below it we can only speak by 行星 (planet). This word moves the
  // copy on the mode axis even when the span width is unchanged.
  const grain = belief.mode === "house" ? "宫位" : "行星";
  return `照你说的那些大事，从${grain}看，我大概把你的出生时辰锁到了 ${fmtWindow([lo, hi])} 这 ${hours} 小时内——再补一件，还能更窄。`;
}

// Re-exported for callers that want the wide/sharp cut without importing rectify.
export { refine };
