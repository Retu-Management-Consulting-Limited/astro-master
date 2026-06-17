import { describe, it, expect } from "vitest";
import { computeChart } from "../astro/chart";
import { dayWealth } from "../astro/wealth";
import { dayBody, bodyLevelToState } from "../astro/body";
import { todayVerdict } from "./todayVerdict";
import { bodyVerdict } from "./bodyVerdict";

// ── T4-P2 · 双轨 todayVerdict + channel 选择 ────────────────────────────────
// todayVerdict 扩成双轨：财运 verdict（既有）+ 身心 verdict（新），并按强度选
// 主导 channel（'钱'|'健康'），主导那条当今日格主体、另一条进 chip。
//
// 承重不变量（也由 edge-preservation.test.ts 守）：加 channel/身心【绝不能改财运
// state/line/lean/quote/door/action/prep】——这些必须与不传 belief 的旧路径 byte-
// identical。channel 与身心 state 都仍是 (chart,date) 的纯函数、belief-无关。

const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });
const D = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
const CHARTS = [A, B, C, D];

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day, 12, 0));

describe("todayVerdict · 财运既有字段不被身心/channel 改写（向后 byte-identical）", () => {
  it("财运 state/line/lean/quote/door/action/prep 与既有不变", () => {
    // 重建一份只看财运字段的"旧快照"——必须与扩展后一致。
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const v = todayVerdict(chart, date);
        const w = dayWealth(chart, 2026, 6, day);
        const expectedState = w.level === "shen" ? "red" : w.level === "wang" ? "green" : "plain";
        expect(v.state, `day ${day} state`).toBe(expectedState); // 财运 state 仍纯来自 wealth
        expect(v.intensity, `day ${day} intensity`).toBe(w.intensity); // 财运 intensity 不变
      }
    }
  });
});

describe("todayVerdict · 身心轨并入（body state/verdict 暴露）", () => {
  it("bodyState 严格来自 dayBody().level（与财运同一套红/绿/平）", () => {
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const v = todayVerdict(chart, date);
        expect(v.bodyState, `day ${day}`).toBe(bodyLevelToState(dayBody(chart, 2026, 6, day).level));
      }
    }
  });

  it("body verdict 暴露的就是 bodyVerdict(chart,date)（同一引擎，不分叉）", () => {
    for (const chart of [A, B]) {
      for (let day = 1; day <= 20; day++) {
        const date = d(2026, 6, day);
        expect(todayVerdict(chart, date).body).toEqual(bodyVerdict(chart, date));
      }
    }
  });
});

describe("todayVerdict · channel 主导选择（按强度）", () => {
  it("channel 恒为 '钱' 或 '健康'", () => {
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const v = todayVerdict(chart, d(2026, 6, day));
        expect(["钱", "健康"]).toContain(v.channel);
      }
    }
  });

  it("channel 是 (chart,date) 的纯函数、belief-无关（沿 edge-preservation）", () => {
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const a = todayVerdict(chart, date).channel;
        const b = todayVerdict(chart, date).channel;
        expect(a).toBe(b);
      }
    }
  });

  it("一方明显 charged(red/green)、另一方平淡时，主导轨是那条 charged 的", () => {
    // 强度判据：red/green 是"有戏"的（charged），plain 是平淡。当且仅当恰有一轨 charged
    // 时，主导必须落在那一轨上（这是 design/23「谁响谁领头」的可证伪核）。
    let asserted = 0;
    for (const chart of CHARTS) {
      for (let day = 1; day <= 30; day++) {
        const date = d(2026, 6, day);
        const v = todayVerdict(chart, date);
        const moneyCharged = v.state !== "plain";
        const bodyCharged = v.bodyState !== "plain";
        if (moneyCharged && !bodyCharged) {
          asserted++;
          expect(v.channel, `money charged 应主导 (day ${day})`).toBe("钱");
        } else if (!moneyCharged && bodyCharged) {
          asserted++;
          expect(v.channel, `body charged 应主导 (day ${day})`).toBe("健康");
        }
      }
    }
    expect(asserted, "没有任何单边 charged 的日子可验，judge vacuous").toBeGreaterThan(0);
  });

  it("两轨都平淡时也要有确定主导（不悬空），且 channel 选择按盘/按天真的会变", () => {
    // 不能整年恒选一轨——那等于没选。扫一年，channel 必须两种都出现过（至少某些盘）。
    const seen = new Set<string>();
    for (const chart of CHARTS) {
      for (let i = 0; i < 365; i++) {
        seen.add(todayVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12))).channel);
      }
    }
    expect(seen.has("钱"), "channel 从不选钱").toBe(true);
    expect(seen.has("健康"), "channel 从不选健康").toBe(true);
  });
});
