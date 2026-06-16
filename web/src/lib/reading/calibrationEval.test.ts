import { describe, it, expect } from "vitest";
import type { BirthInput } from "../astro/chart";
import type { LifeEvent } from "../astro/rectify";
import { seed } from "../astro/timeBelief";
import { completeEvent, detectiveBandCopy } from "./calibrationSignal";
import { validateMoneyCopy } from "../money/guardrail";

// ─────────────────────────────────────────────────────────────────────────────
// T3 Phase 7 · CALIBRATION COPY EVAL (rubric gate)
//
// Derived from docs/2026-06-16-constitution-eval-rubric.md (charter v1.6 / 宪法
// §5.2 镜子非算命, §8 真vs编, §6.2 占星当镜子非确定性下指令). The采访定案 for T3 was
// "真via对天象 + 保留棱角" — so every calibration string Molly speaks (rectification
// 题面 = the 备战糖 event prompt; 时辰侦探文案 = the detective band line) is gated
// here on the CI-runnable, no-PII, rules-based subset of the rubric:
//
//   D1/D3 (真vs编, 🔴一票否决) — no manufactured fear/shame/gamble → money/guardrail.
//   §5.2 / C1 (镜子非算命)     — never frames itself as fortune-telling / god-view.
//   A2 (忠于星盘, 真via对天象)  — anchors to her REAL events/birth chart, not invention.
//   B2 (笃定但承认<100%)       — admits the hour isn't pinned; no false certainty.
//
// LLM-judged rubric rows (A1 cross-chart barnum, A3 真深刻, A4 感受层) are NOT run
// here — they need the harness/real-rater; this is the hard machine gate only.
// ─────────────────────────────────────────────────────────────────────────────

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const EVENT_KINDS: LifeEvent["kind"][] = ["move", "career", "relationship", "health", "family"];

// 算命/上帝视角措辞：把"推断"伪装成"确定的命运/预言/算准"——§5.2 红线。
const ORACLE = /(命中注定|注定|算命|算准|预言|宿命|天机|铁口直断|包准|必然会|一定会发生)/;
// 假装 100% 看透出生时刻的措辞——B2/§6.2 红线（笃定可以，假装上帝视角不行）。
const FALSE_CERTAINTY = /(一定|肯定|保证|百分之百|100%|精确到分|就是.{0,4}点.{0,2}分出生|绝对没错)/;

// Every calibration string must clear the same machine gate.
function assertCharterClean(copy: string, label: string) {
  // D1/D3 真vs编 — no shame / no amount-prediction / no gamble bait.
  expect(validateMoneyCopy(copy).ok, `${label} tripped money/guardrail: ${copy}`).toBe(true);
  // §5.2 镜子非算命 — not dressed up as fortune-telling.
  expect(ORACLE.test(copy), `${label} reads as 算命/oracle: ${copy}`).toBe(false);
  // B2 / §6.2 — never pretends to KNOW the exact minute.
  expect(FALSE_CERTAINTY.test(copy), `${label} fakes god-view certainty: ${copy}`).toBe(false);
}

describe("calibration eval · rectification 题面 (备战糖 event prompt) passes the charter gate", () => {
  it("every event-kind prompt clears 真vs编 / 镜子非算命 / 不假装算准", () => {
    for (const kind of EVENT_KINDS) {
      const ev: LifeEvent = { kind, year: 2019 };
      const { prompt } = completeEvent([ev], ev, 6);
      assertCharterClean(prompt, `备战糖[${kind}]`);
    }
  });

  it("the prompt is 真via对天象 — it anchors to HER real event + that补料 sharpens HER chart (A2)", () => {
    const ev: LifeEvent = { kind: "move", year: 2019 };
    const { prompt } = completeEvent([ev], ev, 6);
    // names the real event she gave us (not a generic horoscope line) ...
    expect(prompt).toContain("搬");
    // ... and frames the ask as making HER chart more accurate (mirror, not oracle).
    expect(prompt).toMatch(/盘.*准|准.*盘/);
  });
});

describe("calibration eval · 时辰侦探文案 (detective band) passes the charter gate", () => {
  const wide = seed(birth, []); // nothing known yet
  const sharp = seed(birth, [
    { kind: "move", year: 2019, month: 3 },
    { kind: "career", year: 2021, month: 9 },
    { kind: "relationship", year: 2023, month: 6 },
  ]);

  it("both the wide and the sharp detective lines clear the charter gate", () => {
    assertCharterClean(detectiveBandCopy(wide), "侦探[wide]");
    assertCharterClean(detectiveBandCopy(sharp), "侦探[sharp]");
  });

  it("a WIDE belief is honest that the hour is NOT locked yet (no false precision — B2/§5.2)", () => {
    const copy = detectiveBandCopy(wide);
    // it must NOT announce a locked window when we don't have one ...
    expect(copy).toMatch(/还在收窄|还没|没.*锁/);
    // ... and it points back to real events as the way to narrow (真via对天象).
    expect(copy).toMatch(/大事|补/);
  });

  it("a SHARP belief reports a SPAN ('X 小时内'), never a single exact minute (镜子非算命)", () => {
    const copy = detectiveBandCopy(sharp);
    expect(copy).toMatch(/小时内/);          // a span, an inference — not a fact
    expect(copy).toMatch(/大概/);            // hedged, 承认<100% (B2)
    expect(copy).not.toMatch(/分出生|精确/); // never a pinned minute
  });
});

// Guard the gate itself isn't toothless: a deliberately 编/算命 line must be REJECTED
// by assertCharterClean. (Meta-test — proves the rubric gate has teeth.)
describe("calibration eval · the charter gate actually rejects 编/算命 copy", () => {
  it("rejects an oracle-framed line", () => {
    expect(ORACLE.test("你命中注定生在午时，算准了。")).toBe(true);
  });
  it("rejects a false-certainty line", () => {
    expect(FALSE_CERTAINTY.test("我一定能精确到分算出你的出生时刻。")).toBe(true);
  });
  it("rejects a shame/gamble line via money/guardrail", () => {
    expect(validateMoneyCopy("不补料你就活该一事无成。").ok).toBe(false);
  });
});
