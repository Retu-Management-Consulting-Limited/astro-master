import { bodyLongitude, type Chart, type BodyName } from "./chart";
import { signRuler, houseSign } from "./wealth";
import type { TodayState } from "../reading/todayVerdict";

// ── 日历渲染助手（对称于 wealth.wealthMark）──────────────────────────────────
// 身心日历格 / 图例 / TodayCell 复用同一套「红/绿/平行动灯」glyph + label，不为身心
// 另起一套配色（design/23：身心格用同一套红/绿/平，teal 只是 chip/标题点缀）。
// 把 mark 收在引擎层，让 /body 页和任何复用身心格的组件认同一份渲染语义。
export function bodyMark(level: BodyLevel): { glyph: string; label: string } {
  if (level === "good") return { glyph: "▲", label: "有劲" };
  if (level === "low") return { glyph: "▼", label: "该歇" };
  return { glyph: "·", label: "平稳" };
}

// 月相标记：行运月亮与太阳的角距（黄经差）。≈0° 新月🌑、≈180° 满月🌕——design/23 第二屏
// 「新月/满月情绪最满」的格子角标。其余日子返回 null（不标）。是 (date) 的纯函数。
export function moonPhaseMark(date: Date): "🌑" | "🌕" | null {
  const moon = bodyLongitude("Moon", date);
  const sun = bodyLongitude("Sun", date);
  const elong = sep(moon, sun);
  if (elong <= 7) return "🌑";
  if (elong >= 173) return "🌕";
  return null;
}

// ── 身心轨（健康）评分引擎 ───────────────────────────────────────────────────
// 与 wealth.ts 完全同构：把行运星象折成一个 0..100 的「身心」分，再用月度稀有
// 配额（天定 + 保底，照 wealth 的 WeakMap memo + rank-quota）把分翻成三态。
//
// 身心三态【复用与财运同一套红/绿/平行动灯语义】——不另起一套配色（UI 真相源
// design/23-health-channel-options.html：身心格用同一套红/绿/平，teal 只是
// chip/标题点缀，不是 state 灯）：
//   有劲 / 状态好 = good → green
//   平稳           = calm → plain
//   低 / 该歇 / 留意 = low  → red
//
// 评分三层（医疗占星语义，对称于 wealth 的「财库点」逻辑）：
//   1. 行运月亮 vs 本命月亮/上升——月亮主情绪与体感节律（和谐相位=有劲，刑冲=该歇）。
//   2. 六宫行运——六宫主健康/日常劳损；行运月亮 / 火 / 土落到六宫宫主或六宫宫位起点，
//      是「身体在替你喊累」的星象（design/23）。
//   3. 火/土压力——火星=发炎/急症/上火、土星=慢性压制/骨骼疲劳；它们刑冲本命月亮/上升
//      时把分压低（该歇）。
export type BodyLevel = "good" | "calm" | "low"; // 有劲 / 平稳 / 该歇·留意

// 身心三态 → 与财运共用的同一套 state（红/绿/平）。这是两轨「同一套行动灯」的硬接点：
// 渲染层（TodayCell / 日历格）只认 red/green/plain，财运与身心都映到这里，不分叉配色。
export function bodyLevelToState(level: BodyLevel): TodayState {
  if (level === "good") return "green";
  if (level === "low") return "red";
  return "plain";
}

export interface DayBody {
  day: number;
  level: BodyLevel;
  intensity: number; // 0..100（身心活力：高=有劲/越绿，低=该歇/越红）
}

function sep(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
// 与 wealth 同款：一组目标角度内的加权命中（orb 内越准越接近 1）。
function harmonic(angle: number, targets: number[], orb = 8): number {
  let best = 0;
  for (const t of targets) {
    const o = Math.abs(angle - t);
    if (o <= orb) best = Math.max(best, 1 - o / orb);
  }
  return best;
}

const natalLon = (chart: Chart, b: BodyName): number | undefined =>
  chart.placements.find((p) => p.body === b)?.lon;

// 身心「体感点」：本命月亮（情绪/体感节律）、上升（身体本身）、六宫宫主（健康宫的主理星）。
// 对称于 wealth 的 moneyPoints（Venus/Jupiter + 2/8 宫主）。
function bodyPoints(chart: Chart): number[] {
  const pts: number[] = [];
  const moon = natalLon(chart, "Moon");
  if (moon != null) pts.push(moon);
  pts.push(chart.asc); // 上升 = 身体/体质
  // 六宫宫主（whole-sign）——健康/日常劳损宫的主理星
  const ruler6 = signRuler(houseSign(chart.ascSignIndex, 6));
  const l6 = natalLon(chart, ruler6);
  if (l6 != null) pts.push(l6);
  return pts;
}

// 六宫宫位起点（whole-sign 六宫所在星座的 0°）——行运慢星压这里 = 「身体在替你喊累」。
function sixthHouseCusp(chart: Chart): number {
  return houseSign(chart.ascSignIndex, 6) * 30;
}

// 身心评分。fast 层 = 行运月亮对体感点的和谐/刑冲；event 层 = 火/土压六宫与体感点。
// 数值结构刻意对称于 wealthScore，便于两轨在 todayVerdict 里并轨选主导。
export function bodyScore(chart: Chart, date: Date): number {
  const moon = bodyLongitude("Moon", date);
  const pts = bodyPoints(chart);
  const cusp6 = sixthHouseCusp(chart);

  // 行运月亮 vs 体感点：合/拱/六合 = 有劲（情绪体感顺）；刑/冲 = 该歇。
  let benefic = 0;
  let malefic = 0;
  for (const p of pts) {
    benefic += harmonic(sep(moon, p), [0, 60, 120]) * 14;
    malefic += harmonic(sep(moon, p), [90, 180]) * 12;
  }
  // 行运月亮压六宫宫位 = 身体替你喊累（design/23 主台词）。
  malefic += harmonic(sep(moon, cusp6), [0, 90, 180]) * 10;

  // 火/土压力层（慢星）：火星=发炎/急症、土星=慢性压制；它们刑冲体感点 / 压六宫时压低分。
  const mars = bodyLongitude("Mars", date);
  const sat = bodyLongitude("Saturn", date);
  for (const p of pts) {
    malefic += harmonic(sep(mars, p), [0, 90, 180], 6) * 8;
    malefic += harmonic(sep(sat, p), [0, 90, 180], 9) * 9;
  }
  // 火/土压六宫宫位：慢相位被压 → 「身体留意区」的星象底座。
  malefic += harmonic(sep(mars, cusp6), [0, 90, 180], 6) * 6;
  malefic += harmonic(sep(sat, cusp6), [0, 90, 180], 9) * 8;
  // 火/土和谐相位给一点「有劲/有动力」的回补（火星拱=精力、土星拱=耐力）。
  for (const p of pts) {
    benefic += harmonic(sep(mars, p), [60, 120], 6) * 5;
    benefic += harmonic(sep(sat, p), [60, 120], 9) * 4;
  }

  return Math.max(0, Math.min(100, Math.round(50 + benefic - malefic)));
}

export function bodyLevel(score: number): BodyLevel {
  if (score >= 64) return "good";
  if (score <= 42) return "low";
  return "calm";
}

// ── 月度稀有配额（天定 + 保底）──────────────────────────────────────────────
// 与 wealth.monthLevels 同款，逐字对称：
//   • 天定——星象分仍决定 WHICH 日排在哪；配额只保留最低分为 low、最高分为 good。
//   • 保底——low 每月 ≤ LOW_CAP，平稳(calm) 每月 ≥ CALM_FLOOR，所以每盘每月都「大多数
//            日子平稳」（design/23：别天天有戏），只有零星几天该歇/有劲。
// intensity（数字）不动；只重塑 LEVEL。配额由 SORTED 分数决定，astronomy-engine 的
// float 在某些平台（Linux CI）是 warm-start/顺序敏感的，边界日可能在重复同参调用间翻面，
// 会让 state 不再是 (chart,date) 的纯函数、戳穿 edge-preservation 守护。因此 MEMOIZE：
// 同一 (chart,year,month) 在一次 run 内永远返回同一个 Record（按 chart 身份 WeakMap 缓存）。
export const LOW_CAP = 4;       // ≤ 4 个 low(red) 日/月
export const CALM_FLOOR = 0.6;  // ≥ 60% 的月份是 calm(平稳)

const _monthLevelsCache = new WeakMap<Chart, Map<number, Record<number, BodyLevel>>>();

export function monthBodyLevels(chart: Chart, year: number, month: number): Record<number, BodyLevel> {
  let byMonth = _monthLevelsCache.get(chart);
  if (!byMonth) { byMonth = new Map(); _monthLevelsCache.set(chart, byMonth); }
  const cacheKey = year * 100 + month;
  const memoized = byMonth.get(cacheKey);
  if (memoized) return memoized;

  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const scored = [];
  for (let d = 1; d <= last; d++) {
    scored.push({ day: d, score: bodyScore(chart, new Date(Date.UTC(year, month - 1, d, 12, 0))) });
  }
  const out: Record<number, BodyLevel> = {};
  for (const s of scored) out[s.day] = "calm";

  // low：在 raw-low 日里，保留最低分的 LOW_CAP 个（分最低、再按日期早先定序），其余回落平稳。
  const rawLow = scored
    .filter((s) => bodyLevel(s.score) === "low")
    .sort((a, b) => a.score - b.score || a.day - b.day);
  for (const s of rawLow.slice(0, LOW_CAP)) out[s.day] = "low";

  // good：平稳必须 ≥ CALM_FLOOR。low 固定后，good 至多 (月 − low − calmFloor)，保留最高分的
  // raw-good 日到这个预算，其余回落平稳。
  const calmFloor = Math.ceil(CALM_FLOOR * last);
  const goodBudget = Math.max(0, last - rawLow.slice(0, LOW_CAP).length - calmFloor);
  const rawGood = scored
    .filter((s) => bodyLevel(s.score) === "good")
    .sort((a, b) => b.score - a.score || a.day - b.day);
  for (const s of rawGood.slice(0, goodBudget)) out[s.day] = "good";

  byMonth.set(cacheKey, out);
  return out;
}

export function dayBody(chart: Chart, year: number, month: number, day: number): DayBody {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const score = bodyScore(chart, date);
  // LEVEL 来自整月配额（单日不与网格冲突）；INTENSITY 仍是原始分。
  const level = monthBodyLevels(chart, year, month)[day];
  return { day, level, intensity: score };
}

export interface MonthBody {
  days: DayBody[];
  goodDays: number[]; // 最有劲的几天（top good）
}

export function monthBody(chart: Chart, year: number, month: number): MonthBody {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const levels = monthBodyLevels(chart, year, month); // 一次配额 pass
  const days: DayBody[] = [];
  for (let d = 1; d <= last; d++) {
    const score = bodyScore(chart, new Date(Date.UTC(year, month - 1, d, 12, 0)));
    days.push({ day: d, level: levels[d], intensity: score });
  }
  const goodDays = [...days]
    .filter((d) => d.level === "good")
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 2)
    .map((d) => d.day)
    .sort((a, b) => a - b);
  return { days, goodDays };
}
