import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "../lib/astro/chart";
import { bodyVerdict, type BodyVerdict } from "../lib/reading/bodyVerdict";
import { dayBody, bodyLevelToState } from "../lib/astro/body";
import { validateMoneyCopy } from "../lib/money/guardrail";
import { seed, refine } from "../lib/astro/timeBelief";
import { confirmBodySignal, selfCheckSource, zoneSource } from "../lib/reading/calibrationSignal";
import type { LifeEvent } from "../lib/astro/rectify";

// ─────────────────────────────────────────────────────────────────────────────
// 身心守宪 · BODY-CHARTER GUARD (T4 Phase 6 · charter v1.6 双轨/健康域线 · Molly 宪法
//   §6.4 转专业 · §8 真vs编 · §9 安全 · §4.4 情感诚实)
//
// 身心轨说的是「该怎么待自己」，不是诊断。它有一条硬域线（charter 健康域线）：
//   ① 说倾向不说病——可点名「该留意的身体区域」+ 让她自证体感，但 app 绝不替医生
//      断言器官得了什么病（"你心脏有病 / 你患了 X 症" = 编 + nocebo + 冒充医疗）。
//   ② 「身体留意区」(zone) 一旦出，必带「转专业」兜底（看医生 / 查 / 对应科室），
//      高风险器官（心/脑/肝）尤其只点区域、必转专业。
//   ③ 身心文案与财运文案同过 money/guardrail（不报数字 / 不羞辱 / 不怂恿）——
//      身心还额外不许把"该歇"写成吓人的坏后果。
//   ④ state 是 (chart,date) 的纯函数、belief-无关：校准（症状自证喂时辰）只锁出生
//      时辰，绝不软化身心情感诚实、绝不抹掉/变少「该歇·留意」日（沿 edge-preservation
//      同一道墙——红日不许被"她爱听"改成绿）。
//
// 这是身心轨的 REGRESSION GUARD。它会在未来某个改动把诊断/病种写进文案、或让某条
// 留意区丢掉转专业兜底、或让校准抹掉一天「该歇」时立刻变红。强断言 only（not.toBe /
// 直接计数比较），不用 Set(...).size 弱形式（CLAUDE.md R15）。
// ─────────────────────────────────────────────────────────────────────────────

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

const birth: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const move: LifeEvent = { kind: "move", year: 2019, month: 3 };
const career: LifeEvent = { kind: "career", year: 2021, month: 9 };

const YEAR_DAYS = 365;
const dayAt = (i: number) => new Date(Date.UTC(2026, 0, 1 + i, 12));

// 一条身心判词里【所有面向用户的串】——守宪检查要覆盖全部，不只主句。
function allStrings(v: BodyVerdict): string[] {
  const out = [v.weather, v.line, v.why, v.care, v.quote];
  if (v.selfCheck) out.push(v.selfCheck.ask, ...v.selfCheck.options);
  if (v.zone) out.push(v.zone.region, v.zone.line, v.zone.why, v.zone.ask, v.zone.refer);
  return out;
}

// 「断病 / 诊断」句式——app 绝不能说出口的（§6.4/§9 健康域线）。点区域 ✓、断病种 ✗。
//   • 直接断言她得了病：你有…病 / 你患…/ 你得了…症 / 确诊 / 病变 / 肿瘤 / 癌 …
//   • 把"留意"升格成诊断结论：…衰竭 / …炎（作为确诊）/ 你的 X 器官坏了 …
const DIAGNOSIS = new RegExp(
  [
    "你(有|患|得了|得过).{0,6}(病|症|癌|瘤|炎|结石|溃疡|衰竭|梗|栓|中风|糖尿|高血压|肿瘤)",
    "确诊", "病变", "癌症", "肿瘤", "你的?(心脏|肝|肾|脑|肺).{0,4}(坏了|衰竭|出了大问题|病了)",
    "诊断(为|出|是)", "你这是.{0,4}(病|症)",
  ].join("|"),
);
// 高风险器官区域（心/脑/肝/肾/肺）—— 仅在「身体留意区」的【区域名 zone.region】这层有意义：
// 那是 app 主动点名的「该留意部位」。这些部位一旦被点名为留意区，必须同条带转专业兜底
// （§9：高风险器官只点区域、必转专业）。注意——不扫月亮天气/能量主句里的口语「脑子歇会儿」
// 这类比喻（那是"动脑想太多"，不是把脑当器官诊断）；守宪管的是有意点名的留意区，不是成语。
const HIGH_RISK_ORGAN = /(心 \/|脑|肝|肾|肺)/;
// 转专业兜底必须含的就医指引动词之一。
const REFER_VERB = /(看医生|就医|医院|科室|挂号|体检|检查|查清楚|去看|找医生)/;

describe("身心守宪 · 身心文案说倾向不说病——绝不出现诊断/病种断言", () => {
  it("a full year of body verdicts (3 charts) never asserts a disease/diagnosis — only regions & tendencies", () => {
    let scanned = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        for (const s of allStrings(v)) {
          scanned++;
          expect(DIAGNOSIS.test(s), `身心文案出现诊断/病种断言 (doy ${i}): ${s}`).toBe(false);
        }
      }
    }
    // not-vacuous: 一年三盘扫了大量串
    expect(scanned, "scanned too few body strings — diagnosis check vacuous").toBeGreaterThan(5000);
  });

  it("every body string passes the money/guardrail (no 数字预测 / 羞辱 / 怂恿) — body shares the wealth gate", () => {
    let scanned = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        for (const s of allStrings(v)) {
          scanned++;
          expect(validateMoneyCopy(s).ok, `身心串没过 guardrail (doy ${i}): ${s}`).toBe(true);
        }
      }
    }
    expect(scanned, "scanned too few body strings — guardrail check vacuous").toBeGreaterThan(5000);
  });
});

describe("身心守宪 · 「身体留意区」一出必带转专业兜底，高风险器官尤其", () => {
  it("every zone carries a 转专业 referral with a medical-action verb, and never asserts a disease", () => {
    let zonesSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        if (!v.zone) continue;
        zonesSeen++;
        // ② 必带转专业兜底
        expect(REFER_VERB.test(v.zone.refer), `留意区缺转专业兜底 (doy ${i}): ${v.zone.refer}`).toBe(true);
        // ① 区域只点名、不断病
        expect(DIAGNOSIS.test(v.zone.line), `留意区主句断病 (doy ${i}): ${v.zone.line}`).toBe(false);
        expect(DIAGNOSIS.test(v.zone.region), `留意区区域名断病 (doy ${i}): ${v.zone.region}`).toBe(false);
        // refer 必须明示「我不替医生断病」这条边界（self-binding 的转专业语气，不冒充医疗）
        expect(v.zone.refer.length, `留意区 refer 太短 (doy ${i})`).toBeGreaterThan(0);
      }
    }
    expect(zonesSeen, "no 身体留意区 surfaced on any chart in a year — referral check vacuous").toBeGreaterThan(0);
  });

  it("when a 留意区 names a HIGH-RISK organ region (心/脑/肝/肾/肺), it must carry a 转专业 referral — app never self-asserts", () => {
    // §9：高风险器官只点区域 + 必转专业。守宪管的是【有意点名的留意区】(zone.region)，
    // 不是能量主句里的口语比喻（如"脑子歇会儿"=动脑，已被 region-scope 排除）。
    let highRiskSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        if (!v.zone || !HIGH_RISK_ORGAN.test(v.zone.region)) continue;
        highRiskSeen++;
        // 高风险器官被点为留意区 → 必带转专业兜底，且区域名不得带病种断言。
        expect(REFER_VERB.test(v.zone.refer), `高风险器官留意区没连转专业 (doy ${i}): ${v.zone.refer}`).toBe(true);
        expect(DIAGNOSIS.test(v.zone.line), `高风险器官留意区主句断病 (doy ${i}): ${v.zone.line}`).toBe(false);
      }
    }
    // 高风险器官区域是稀有 zone（狮子=心/后背、射手=肝/大腿）的一部分；一年三盘里应能见到。
    expect(highRiskSeen, "no high-risk-organ 留意区 surfaced — high-risk referral check vacuous").toBeGreaterThan(0);
  });
});

describe("身心守宪 · 症状自证只问她答得了的体感，不点她答不了的病", () => {
  it("selfCheck only appears on red(该歇) days and asks about felt regions, never a diagnosis", () => {
    let checksSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        if (!v.selfCheck) continue;
        checksSeen++;
        // selfCheck 只在 red 日
        expect(v.state, `selfCheck 出现在非 red 日 (doy ${i})`).toBe("red");
        // 问的是体感、不是病
        expect(DIAGNOSIS.test(v.selfCheck.ask), `症状自证问成了诊断 (doy ${i}): ${v.selfCheck.ask}`).toBe(false);
        expect(v.selfCheck.options.length, `症状自证选项 <2 (doy ${i})`).toBeGreaterThanOrEqual(2);
      }
    }
    expect(checksSeen, "no selfCheck surfaced — symptom self-report check vacuous").toBeGreaterThan(0);
  });
});

// ── edge-preservation 扩到身心：校准只锁时辰，不软化身心情感诚实、不抹掉「该歇」日 ──
describe("身心守宪 · 身心 state 没有校准门 (state 是 (chart,date) 纯函数、belief-无关)", () => {
  it("bodyVerdict.state is a PURE function of (chart, date) — exactly dayBody().level mapped, no belief reachable", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const d = dayAt(i);
        const b = dayBody(chart, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        expect(bodyVerdict(chart, d).state, `身心 state 偏离 dayBody on doy ${i}`).toBe(bodyLevelToState(b.level));
      }
    }
  });

  it("bodyVerdict is deterministic — re-reading the same (chart,date) is byte-identical (no hidden belief/mood)", () => {
    for (const chart of [A, B, C]) {
      for (let i = 0; i < 30; i++) {
        expect(bodyVerdict(chart, dayAt(i))).toEqual(bodyVerdict(chart, dayAt(i)));
      }
    }
  });

  it("each chart actually HAS red(该歇) days — the 留意-preservation guard isn't vacuously protecting an empty set", () => {
    for (const chart of [A, B, C]) {
      const reds = Array.from({ length: YEAR_DAYS }, (_, i) => bodyVerdict(chart, dayAt(i)).state).filter(
        (s) => s === "red",
      ).length;
      expect(reds, "no 该歇 days in a whole year — 留意-preservation is vacuous").toBeGreaterThan(0);
    }
  });
});

describe("身心守宪 · 症状自证喂时辰不软化身心、不减「该歇」日 (校准是时辰证据，不是身心投票)", () => {
  it("confirming a body signal moves ONLY the hour belief — it cannot reach back and edit the body state grid", () => {
    // 模拟每日循环：她每天对四角相关的身心信号点"准"一年。身心 state 网格必须一字不动。
    let belief = seed(birth, [move, career]);
    for (let i = 0; i < YEAR_DAYS; i++) {
      const d = dayAt(i);
      const before = bodyVerdict(A, d);
      const v = bodyVerdict(A, d);
      // 用当天真有的自证面喂（zone 必喂、selfCheck 带 target）——走真实接线。
      if (v.zone) belief = confirmBodySignal(belief, zoneSource());
      else if (v.selfCheck) belief = confirmBodySignal(belief, selfCheckSource(v.selfCheck.target));
      const after = bodyVerdict(A, d); // 重读同一天
      expect(after, `身心校准回过头改了同日身心判词 (doy ${i})`).toEqual(before);
    }
  });

  it("the year's 该歇(red) body-day SET is fixed by the sky and unmoved by any belief state (校准不减留意日)", () => {
    // 没有任何 API 让收窄后的 belief 喂回 bodyVerdict 的 state——红日网格按构造不可动。
    // 直接断言：每天 state 都能从 dayBody 纯推出来，belief 不在环里。若未来某改动加了
    // belief 参数并抹掉一天「该歇」，这条（连同上面的纯函数断言）会红。
    for (const chart of [A, B, C]) {
      const grid1 = Array.from({ length: YEAR_DAYS }, (_, i) => bodyVerdict(chart, dayAt(i)).state);
      const grid2 = Array.from({ length: YEAR_DAYS }, (_, i) => {
        const d = dayAt(i);
        const b = dayBody(chart, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        return bodyLevelToState(b.level);
      });
      expect(grid1).toEqual(grid2);
      // 而且「该歇」日真有量——不是空集（与 wealth 红日守护同样要有牙）。
      expect(grid1.filter((s) => s === "red").length, "该歇日空集，留意-preservation 空转").toBeGreaterThan(0);
    }
  });

  it("no amount of body-signal applause manufactures god-view — repeated confirms stay capped below confidence=1", () => {
    // §4.4/§8：哪怕她天天点"准"，也绝不假装知道她的出生分钟。身心确认走的还是时辰那条
    // asymptotic 封顶的收窄管线（confirmBodySignal → refine confirm），上限即诚实底线。
    let b = seed(birth, [move, career]);
    for (let i = 0; i < 500; i++) b = confirmBodySignal(b, zoneSource());
    expect(b.confidence).toBeLessThan(1);
    // 而纯行星身心确认一字不喂（不编造她没给的精度）——referentially equal。
    const planet = seed(birth, [move]);
    expect(confirmBodySignal(planet, selfCheckSource("Moon")), "纯行星身心确认漏喂了时辰").toBe(planet);
    expect(confirmBodySignal(planet, selfCheckSource("Mars")), "纯行星身心确认漏喂了时辰").toBe(planet);
  });
});

describe("身心守宪 · 校准不把身心声音抹平成单一顺耳调 (情感诚实保留)", () => {
  it("红(该歇)日仍交付有分量的 permission line + selfCheck door — 校准从不静音它", () => {
    // §4.4 情感诚实：该歇的格子可以不舒服（别硬扛 / 身体在替你喊累），且红日必带
    // 症状自证这道"门"（红日丢了 selfCheck = 被软化的红）。
    let redSeen = 0;
    for (const chart of [A, B, C]) {
      for (let i = 0; i < YEAR_DAYS; i++) {
        const v = bodyVerdict(chart, dayAt(i));
        if (v.state !== "red") continue;
        redSeen++;
        expect(v.line.length, `该歇 line 空 (doy ${i})`).toBeGreaterThan(0);
        expect(v.selfCheck, `该歇日丢了症状自证门 (doy ${i})`).toBeTruthy();
        expect(refferableHonest(v), `该歇 copy 被改成了吓人的坏后果 (doy ${i})`).toBe(true);
      }
    }
    expect(redSeen, "no 该歇 days exercised — honesty check vacuous").toBeGreaterThan(0);
  });
});

// "情感诚实但安全"：该歇文案可以戳（别硬扛），但不许写成 nocebo 式的坏后果/吓人结论。
// 复用 money/guardrail（羞辱/赌性/数字预测）+ 不出现诊断断言，即视为诚实-且-安全。
function refferableHonest(v: BodyVerdict): boolean {
  return [v.line, v.why, v.care, v.quote].every((s) => validateMoneyCopy(s).ok && !DIAGNOSIS.test(s));
}
