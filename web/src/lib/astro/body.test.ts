import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import {
  bodyScore,
  bodyLevel,
  bodyLevelToState,
  dayBody,
  monthBody,
  monthBodyLevels,
  type BodyLevel,
} from "./body";

// ── 身心轨引擎测试（仿 wealth.test.ts）──────────────────────────────────────
// 身心评分 = 行运月亮态 + 六宫行运 + 火/土压力 → bodyLevel 三态。
// bodyLevel 必须复用与财运同一套红/绿/平行动灯语义（design/23）：
//   有劲/状态好 = good  → green
//   平稳         = calm  → plain
//   低/该歇/留意 = low   → red
// monthBodyLevels 照 wealth.ts 的 WeakMap memo + rank-quota，防平台浮点非确定。

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });
const D = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
const CHARTS = [A, B, C, D];

describe("身心评分引擎 bodyScore / bodyLevel", () => {
  it("bodyScore 落在 0..100", () => {
    for (let d = 1; d <= 28; d++) {
      const s = bodyScore(A, new Date(Date.UTC(2026, 5, d, 12, 0)));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("bodyScore 是 (chart,date) 的纯函数（同参数恒等、确定性）", () => {
    for (const ch of CHARTS) {
      for (let d = 1; d <= 30; d++) {
        const date = new Date(Date.UTC(2026, 5, d, 12, 0));
        expect(bodyScore(ch, date)).toBe(bodyScore(ch, date));
      }
    }
  });

  it("bodyLevel 阈值（good/calm/low）", () => {
    expect(bodyLevel(80)).toBe<BodyLevel>("good");
    expect(bodyLevel(50)).toBe<BodyLevel>("calm");
    expect(bodyLevel(20)).toBe<BodyLevel>("low");
  });

  it("bodyLevelToState 复用与财运同一套红/绿/平语义（不另起配色）", () => {
    expect(bodyLevelToState("good")).toBe("green");
    expect(bodyLevelToState("calm")).toBe("plain");
    expect(bodyLevelToState("low")).toBe("red");
  });
});

describe("身心轨 · 动态内容契约（按天变 / 按盘不同，最强断言）", () => {
  it("按天变：相邻日的身心态在一个月里不全相同（not all identical）", () => {
    const m = monthBody(A, 2026, 6);
    const levels = m.days.map((d) => d.level);
    // 强断言：至少有一对相邻日不同（不靠 Set.size>1 弱断言）
    let adjacentDiffer = false;
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] !== levels[i - 1]) { adjacentDiffer = true; break; }
    }
    expect(adjacentDiffer, "相邻日身心态全相同——按天的呈现没变").toBe(true);
  });

  it("按盘不同：不同盘的整月身心态序列不同（相邻盘 not.toBe，禁 Set.size>1）", () => {
    const sig = (ch: ReturnType<typeof computeChart>) =>
      monthBody(ch, 2026, 6).days.map((d) => d.level).join("");
    expect(sig(A)).not.toBe(sig(B));
    expect(sig(B)).not.toBe(sig(C));
    expect(sig(C)).not.toBe(sig(D));
  });

  it("按盘不同：同一天不同盘的 bodyScore 不同（相邻盘 not.toBe）", () => {
    const date = new Date(Date.UTC(2026, 5, 16, 12, 0));
    expect(bodyScore(A, date)).not.toBe(bodyScore(B, date));
    expect(bodyScore(B, date)).not.toBe(bodyScore(C, date));
  });
});

describe("身心轨 · 月度稀有配额（天定 + 保底，仿 wealth）", () => {
  // 留意(low/red)是稀有的——大多数日子平稳（design/23：『大多数日子平稳，别天天有戏』）。
  // 配额：low ≤ LOW_CAP/月、calm(平稳) ≥ CALM_FLOOR/月，每盘每月皆然。
  it("每盘、2026 每月：留意(low) 天数 ≤ 4", () => {
    for (const ch of CHARTS) {
      for (let m = 1; m <= 12; m++) {
        const low = monthBody(ch, 2026, m).days.filter((d) => d.level === "low").length;
        expect(low, `month ${m} 有 ${low} 个 low 日`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("每盘、2026 每月：平稳(calm) ≥ 60% of the month", () => {
    for (const ch of CHARTS) {
      for (let m = 1; m <= 12; m++) {
        const days = monthBody(ch, 2026, m).days;
        const calm = days.filter((d) => d.level === "calm").length;
        const floor = Math.ceil(0.6 * days.length);
        expect(calm, `month ${m}: ${calm}/${days.length} calm, floor ${floor}`).toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("天定：配额保留星象 RANK——留下的 low 是最低分日、good 是最高分日", () => {
    for (const ch of CHARTS) {
      const days = monthBody(ch, 2026, 6).days;
      const maxLow = Math.max(...days.filter((d) => d.level === "low").map((d) => d.intensity), -1);
      const minGood = Math.min(...days.filter((d) => d.level === "good").map((d) => d.intensity), 101);
      const calmI = days.filter((d) => d.level === "calm").map((d) => d.intensity);
      for (const c of calmI) {
        if (minGood <= 100) expect(c, "一个 calm 日反超了留下的 good").toBeLessThanOrEqual(minGood);
        if (maxLow >= 0) expect(c, "一个 calm 日反低于留下的 low").toBeGreaterThanOrEqual(maxLow);
      }
    }
  });

  it("非空集：每盘一年里确有 low(留意) 日——配额/天定断言不是空守一个空集", () => {
    for (const ch of CHARTS) {
      let lowSeen = 0;
      for (let m = 1; m <= 12; m++) {
        lowSeen += monthBody(ch, 2026, m).days.filter((d) => d.level === "low").length;
      }
      expect(lowSeen, "一整年没有 low 日——天定/配额断言形同虚设").toBeGreaterThan(0);
    }
  });

  it("配额不过度压平：一年里多数月仍有 charge（非全 calm）", () => {
    for (const ch of CHARTS) {
      let monthsWithCharge = 0;
      for (let m = 1; m <= 12; m++) {
        const days = monthBody(ch, 2026, m).days;
        if (days.some((d) => d.level !== "calm")) monthsWithCharge++;
      }
      expect(monthsWithCharge, "一整年身心全平").toBeGreaterThan(6);
    }
  });
});

describe("身心轨 · 单日 vs 整月一致 + memo 同参恒等", () => {
  it("单日 dayBody().level 与整月配额结果一致（无 per-day vs per-month 漂移）", () => {
    for (const ch of CHARTS) {
      const m = monthBody(ch, 2026, 6);
      for (const d of m.days) {
        expect(dayBody(ch, 2026, 6, d.day).level, `day ${d.day}`).toBe(d.level);
      }
    }
  });

  it("intensity 仍是原始分（配额只重塑 LEVEL，不动数字）", () => {
    const m = monthBody(A, 2026, 6);
    for (const d of m.days) {
      expect(d.intensity).toBe(bodyScore(A, new Date(Date.UTC(2026, 5, d.day, 12, 0))));
    }
  });

  it("monthBodyLevels memo：同参数返回同一个 Record（防平台浮点非确定）", () => {
    const r1 = monthBodyLevels(A, 2026, 6);
    const r2 = monthBodyLevels(A, 2026, 6);
    expect(r1).toBe(r2); // referential identity (WeakMap memo)
  });

  it("dayBody.level 严格映射到与财运同一套 state（low→red, good→green, calm→plain）", () => {
    for (const ch of CHARTS) {
      const m = monthBody(ch, 2026, 6);
      for (const d of m.days) {
        const state = bodyLevelToState(d.level);
        expect(["red", "green", "plain"]).toContain(state);
      }
    }
  });
});
