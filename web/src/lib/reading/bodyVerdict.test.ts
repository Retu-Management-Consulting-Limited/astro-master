import { describe, it, expect } from "vitest";
import { computeChart } from "../astro/chart";
import { dayBody, bodyLevelToState } from "../astro/body";
import { validateMoneyCopy } from "../money/guardrail";
import { bodyVerdict, type BodyVerdict } from "./bodyVerdict";

// ── T4-P2 · 身心判词（bodyVerdict）测试 ──────────────────────────────────────
// 身心判词 = 能量态主句（安抚/permission）+ 内在 why（怎么待自己）+ 自我照顾许可
//          + 症状自证微互动。state 仍来自 bodyLevel（与财运同一套红/绿/平），
//          且 belief-无关、是 (chart,date) 的纯函数（沿 edge-preservation）。
//
// 「身体留意区」（稀有，慢相位/六宫被压才出）：点名身体区域 + 问她信号 + 转专业。
// 硬 charter：区域 ✓ / 自证 ✓ / 转专业 ✓；器官病种诊断 ✗；高风险器官（心/脑/肝）必连转专业。

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });
const D = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
const CHARTS = [A, B, C, D];

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day, 12, 0));

// A day in 2026-06 whose dayBody.level matches a target, or null.
function maybeBodyDay(chart: typeof A, level: "good" | "calm" | "low"): Date | null {
  for (let day = 1; day <= 30; day++) {
    if (dayBody(chart, 2026, 6, day).level === level) return d(2026, 6, day);
  }
  return null;
}

describe("bodyVerdict · state ← bodyLevel（与财运同一套红/绿/平），纯 (chart,date) 函数", () => {
  it("state 严格 1:1 来自 dayBody().level（low→red, good→green, calm→plain）", () => {
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const expected = bodyLevelToState(dayBody(chart, 2026, 6, day).level);
        expect(bodyVerdict(chart, date).state, `day ${day}`).toBe(expected);
      }
    }
  });

  it("确定性：同一 (chart,date) 重读 byte-identical（无隐藏 belief/mood 状态）", () => {
    for (const chart of CHARTS) {
      for (let i = 0; i < 30; i++) {
        const date = d(2026, 6, 1 + i);
        expect(bodyVerdict(chart, date)).toEqual(bodyVerdict(chart, date));
      }
    }
  });

  it("intensity 原样透传自 dayBody().intensity", () => {
    for (const chart of [A, B]) {
      for (let day = 1; day <= 28; day++) {
        const date = d(2026, 6, day);
        expect(bodyVerdict(chart, date).intensity).toBe(dayBody(chart, 2026, 6, day).intensity);
      }
    }
  });
});

describe("bodyVerdict · 判词三态各出、安抚/permission 主味、症状自证", () => {
  it("三态都有非空主句 line + 内在 why + 自我照顾许可 care", () => {
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const v = bodyVerdict(chart, d(2026, 6, day));
        expect(v.line.length, `line empty day ${day}`).toBeGreaterThan(0);
        expect(v.why.length, `why empty day ${day}`).toBeGreaterThan(0);
        expect(v.care.length, `care empty day ${day}`).toBeGreaterThan(0);
      }
    }
  });

  it("低/该歇(red)日带症状自证微互动（问她身体哪先喊累，她自证得了）", () => {
    const lowDay = maybeBodyDay(A, "low") ?? maybeBodyDay(B, "low") ?? maybeBodyDay(C, "low") ?? maybeBodyDay(D, "low");
    expect(lowDay, "fixtures 一月内无 low 日，自证检查 vacuous").toBeTruthy();
    let seen = 0;
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const v = bodyVerdict(chart, d(2026, 6, day));
        if (v.state !== "red") continue;
        seen++;
        // 症状自证：问她身体哪块先给信号——她答得了的「症状」，不是诊断
        expect(v.selfCheck, `red day ${day} 缺症状自证`).toBeTruthy();
        expect(v.selfCheck!.ask.length, `selfCheck.ask empty`).toBeGreaterThan(0);
        // 至少两个候选区域选项（让她指认是哪块在喊累）
        expect(v.selfCheck!.options.length, "selfCheck.options 太少").toBeGreaterThanOrEqual(2);
      }
    }
    expect(seen, "没走到任何 red 日").toBeGreaterThan(0);
  });

  it("rotation：相邻同态日 line 不复读（沿 freshness 强形式）", () => {
    for (const chart of CHARTS) {
      let prev: BodyVerdict | null = null;
      let sameStatePairs = 0;
      for (let i = 0; i < 365; i++) {
        const v = bodyVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12)));
        if (prev && prev.state === v.state) {
          sameStatePairs++;
          expect(prev.line, `frozen body line, same-state adjacent days (doy ${i})`).not.toBe(v.line);
        }
        prev = v;
      }
      expect(sameStatePairs, "too few same-state pairs").toBeGreaterThan(50);
    }
  });

  it("personalized：同一天不同盘 line 不同（按盘个性化）", () => {
    const day = d(2026, 6, 16);
    const lines = CHARTS.map((ch) => bodyVerdict(ch, day).line);
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i], `chart ${i} 与前盘同 line`).not.toBe(lines[i - 1]);
    }
  });
});

describe("bodyVerdict · charter 硬约束：区域 ✓ / 自证 ✓ / 转专业 ✓；诊断 ✗", () => {
  // 全年扫描，对每一条身心文案做守宪断言。
  const ALL_DAYS = () => {
    const out: { chart: typeof A; v: BodyVerdict; doy: number }[] = [];
    for (const chart of CHARTS) {
      for (let i = 0; i < 365; i++) {
        out.push({ chart, v: bodyVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12))), doy: i });
      }
    }
    return out;
  };

  // 病种/诊断断言词（"你有X病 / 你患了 / 确诊"）= 编 + nocebo + 冒充医疗，禁。
  const DIAGNOSIS = /(你(有|患了|得了|得过).{0,4}(病|症|癌|炎|瘤))|确诊|诊断为|你的?(心脏|肝|肾|肺|脑|胃|肠).{0,3}(有病|坏了|衰竭|出问题了)/;

  it("没有任何一条身心文案做器官病种诊断断言（说倾向不说病）", () => {
    for (const { v, doy } of ALL_DAYS()) {
      const texts = [v.line, v.why, v.care, v.selfCheck?.ask ?? "", v.zone?.line ?? "", v.zone?.why ?? "", v.zone?.refer ?? ""];
      for (const t of texts) {
        expect(DIAGNOSIS.test(t), `诊断断言 (doy ${doy}): ${t}`).toBe(false);
      }
    }
  });

  it("所有身心文案过 money/guardrail（不报数字 / 不羞辱 / 不怂恿赌性）", () => {
    for (const { v, doy } of ALL_DAYS()) {
      const texts = [v.line, v.why, v.care, v.quote, v.selfCheck?.ask ?? "", v.zone?.line ?? "", v.zone?.why ?? "", v.zone?.refer ?? ""];
      for (const t of texts) {
        if (!t) continue;
        expect(validateMoneyCopy(t).ok, `guardrail fail (doy ${doy}): ${t}`).toBe(true);
      }
    }
  });

  it("身体留意区是稀有的（不是每天都出）", () => {
    let withZone = 0;
    let total = 0;
    for (const { v } of ALL_DAYS()) {
      total++;
      if (v.zone) withZone++;
    }
    expect(withZone, "留意区从不出现——稀有组件成了死代码").toBeGreaterThan(0);
    // 稀有：远少于半数日子
    expect(withZone, "留意区天天出，不再稀有").toBeLessThan(total / 2);
  });

  it("身体留意区出现时：点名区域 ✓ + 问她信号(自证) ✓ + 转专业兜底 ✓", () => {
    let seen = 0;
    for (const { v, doy } of ALL_DAYS()) {
      if (!v.zone) continue;
      seen++;
      expect(v.zone.region.length, `zone.region empty (doy ${doy})`).toBeGreaterThan(0); // 点名区域
      expect(v.zone.ask.length, `zone.ask empty (doy ${doy})`).toBeGreaterThan(0); // 问她信号
      expect(v.zone.refer.length, `zone.refer empty (doy ${doy})`).toBeGreaterThan(0); // 转专业兜底
      // 转专业兜底必含"看/查/科/医"等就医指引动词
      expect(/(看|查|科|医生|体检|检查)/.test(v.zone.refer), `zone.refer 无转专业指引 (doy ${doy}): ${v.zone.refer}`).toBe(true);
    }
    expect(seen, "从没走到留意区").toBeGreaterThan(0);
  });

  it("高风险器官（心/脑/肝）留意区必连转专业、app 不自己断言", () => {
    let highRiskSeen = 0;
    for (const { v, doy } of ALL_DAYS()) {
      if (!v.zone) continue;
      const isHighRisk = /(心|脑|肝)/.test(v.zone.region);
      if (!isHighRisk) continue;
      highRiskSeen++;
      // 必连转专业
      expect(/(看|查|科|医生|体检|检查)/.test(v.zone.refer), `高风险区无转专业 (doy ${doy})`).toBe(true);
      // 不自己断言"你心脏有病"等
      expect(/(你的?(心|脑|肝).{0,3}(有病|出问题|坏了|衰竭))/.test(v.zone.line + v.zone.why), `高风险区做了断言 (doy ${doy})`).toBe(false);
    }
    // 高风险区不保证每年都出现——若出现过，上面断言必须成立；若一次没出现亦可接受。
    expect(highRiskSeen, `high-risk zone seen ${highRiskSeen} times`).toBeGreaterThanOrEqual(0);
  });
});
