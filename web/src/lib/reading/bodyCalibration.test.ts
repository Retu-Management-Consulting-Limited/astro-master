import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "../astro/chart";
import { seed } from "../astro/timeBelief";
import type { LifeEvent } from "../astro/rectify";
import {
  isBodySignalAngleRelated,
  confirmBodySignal,
  bodySignalAck,
  selfCheckSource,
  zoneSource,
  type BodySignalSource,
} from "./calibrationSignal";
import { bodyVerdict } from "./bodyVerdict";
import { validateMoneyCopy } from "../money/guardrail";

// ── T4 Phase 5 · 症状自证 → 喂时辰校准（身心轨）────────────────────────────────
// 身心判词的症状自证微互动：她确认了某个体感信号 → 喂身心自我模型；并且当那个
// 信号是【四角(ASC/MC)/六宫相关】时，顺手 refine(confirm) 喂 timeBelief——因为六宫
// 宫位/宫主由上升推出、四角本身就是时辰敏感点，这种确认对她的出生时辰是真证据。
// 纯行星相关的身心确认（今天月亮只是结到她本命某行星）对出生时辰没说什么，绝不喂
// （宪法 §8 真vs编：不编造她没真给的校准）。语义照搬 T3 的 confirmVerdict 四角门。

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const move: LifeEvent = { kind: "move", year: 2019, month: 3 };

describe("Phase 5 — 身心信号 angle/六宫门 (which body confirmations feed the hour)", () => {
  it("身体留意区(zone) is 六宫-anchored → angle-related (it's the 6th cusp/ruler, hour-sensitive)", () => {
    const zone: BodySignalSource = { kind: "zone" };
    expect(isBodySignalAngleRelated(zone)).toBe(true);
  });

  it("症状自证(selfCheck) on an ASC/MC moon-target IS angle-related", () => {
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "ASC" })).toBe(true);
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "MC" })).toBe(true);
  });

  it("症状自证 on a PURE-PLANET moon-target is NOT angle-related (Moon/Sun/Mars…)", () => {
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "Moon" })).toBe(false);
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "Sun" })).toBe(false);
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "Mars" })).toBe(false);
    expect(isBodySignalAngleRelated({ kind: "selfCheck", target: "Saturn" })).toBe(false);
  });
});

describe("Phase 5 — 四角/六宫相关身心确认 → belief 微升", () => {
  it("confirming a 身体留意区(zone) signal ticks confidence up (六宫=时辰敏感)", () => {
    const before = seed(birth, [move]);
    const after = confirmBodySignal(before, { kind: "zone" });
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });

  it("confirming an ASC-targeted selfCheck ticks confidence up", () => {
    const before = seed(birth, [move]);
    const after = confirmBodySignal(before, { kind: "selfCheck", target: "ASC" });
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });

  it("MC-targeted selfCheck also feeds (the other angle)", () => {
    const before = seed(birth, [move]);
    const after = confirmBodySignal(before, { kind: "selfCheck", target: "MC" });
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });
});

describe("Phase 5 — 纯行星身心确认 → belief 不动 (referentially equal)", () => {
  it("a pure-planet selfCheck confirm returns the belief UNTOUCHED (same reference)", () => {
    const before = seed(birth, [move]);
    const after = confirmBodySignal(before, { kind: "selfCheck", target: "Moon" });
    // 绝不编造校准：纯行星确认 referentially 相等、confidence 一字不动。
    expect(after).toBe(before);
    expect(after.confidence).toBe(before.confidence);
  });

  it("Mars / Saturn / Sun pure-planet selfCheck confirms all no-op", () => {
    const before = seed(birth, [move]);
    for (const target of ["Mars", "Saturn", "Sun", "Mercury", "Venus"] as const) {
      const after = confirmBodySignal(before, { kind: "selfCheck", target });
      expect(after).toBe(before);
    }
  });
});

describe("Phase 5 — 喂时辰只锁时辰精度，不软化身心情感诚实 (edge-preservation 同源)", () => {
  it("feeding the belief from a body signal only moves confidence, never topRange (hour band stays)", () => {
    const before = seed(birth, [move]);
    const after = confirmBodySignal(before, { kind: "zone" });
    // 校准只让 confidence 微升、topRange(锁到的时辰窗) 不动——身心确认不会改写她的
    // 时辰分布形状，只是对它更有把握（沿 refine confirm 的 distribution-preserving）。
    expect(after.topRange).toEqual(before.topRange);
  });

  it("the bump is asymptotic & capped (200 body confirms cannot manufacture certainty)", () => {
    let b = seed(birth, [move]);
    for (let i = 0; i < 200; i++) b = confirmBodySignal(b, { kind: "zone" });
    expect(b.confidence).toBeLessThan(1);
    expect(b.confidence).toBeLessThan(0.92 + 1e-9);
  });
});

describe("Phase 5 — 端到端：真 bodyVerdict 的自证面驱动时辰门 (the surface carries its own target)", () => {
  // 真盘 + 真红日的 selfCheck.target 必须正确驱动门：四角 target → 喂、纯行星 → 不喂。
  // 这把"接线"钉死在真实星象上——而不是只测一个手写 source。
  const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
  const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
  const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

  it("every red day's selfCheck carries a target, and routing it through the gate matches isAngleRelated", () => {
    let angleSeen = 0;
    let planetSeen = 0;
    const wide = seed(
      { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 },
      [move],
    );
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 365; i++) {
        const date = new Date(Date.UTC(2026, 0, 1 + i, 12));
        const v = bodyVerdict(chart, date);
        if (!v.selfCheck) continue;
        const src = selfCheckSource(v.selfCheck.target);
        const fed = confirmBodySignal(wide, src);
        if (v.selfCheck.target === "ASC" || v.selfCheck.target === "MC") {
          angleSeen++;
          expect(fed.confidence, `angle selfCheck did not feed on ${chart === A ? "A" : chart === B ? "B" : "C"} doy ${i}`).toBeGreaterThan(wide.confidence);
        } else {
          planetSeen++;
          expect(fed, `pure-planet selfCheck fed the belief on doy ${i}`).toBe(wide);
        }
      }
    }
    // 两类都被真实星象触发过——这条断言不是空保护。
    expect(angleSeen, "no angle-target red days in 3 charts × a year — gate vacuous").toBeGreaterThan(0);
    expect(planetSeen, "no pure-planet red days — gate vacuous").toBeGreaterThan(0);
  });

  it("a zone (when it surfaces) always feeds — it's 六宫-anchored, hour-sensitive by construction", () => {
    const wide = seed(
      { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 },
      [move],
    );
    let zoneSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 365; i++) {
        const v = bodyVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12)));
        if (!v.zone) continue;
        zoneSeen++;
        const fed = confirmBodySignal(wide, zoneSource());
        expect(fed.confidence).toBeGreaterThan(wide.confidence);
      }
    }
    expect(zoneSeen, "no zone surfaced in 3 charts × a year — can't assert zone feeds").toBeGreaterThan(0);
  });
});

describe("Phase 5 — 症状自证文案过 money/guardrail (说倾向不说病, no amount/shame/gamble)", () => {
  it("the self-model 'seen' acknowledgement copy is guardrail-clean", () => {
    // 她一答=被看穿+喂身心模型；这句「被看穿」的回话不报数字/不羞辱/不怂恿赌性，
    // 也不断病种（说倾向不说病）。
    const seen = bodySignalAck("肠胃");
    expect(validateMoneyCopy(seen).ok).toBe(true);
    expect(seen).not.toMatch(/病|症|确诊|癌|心脏病|肝病/); // 不断病种
  });
});
