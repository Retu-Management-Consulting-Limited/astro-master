import type { Chart, BodyName } from "../astro/chart";
import { dayWealth, type WealthLevel } from "../astro/wealth";

// 今日财运 → 一句"该怎么过今天"的笃定判词。纯逻辑、确定性、无 AI。
//
// 这是 /today「今日财运」格的内核，把 dayWealth 的 旺/平/慎 翻成三态行动判词：
//   • 慎(shen) → red  ：有一道"门"——doorDate 指向 /wealth 当天，让她去看这天为什么慎，
//                       是把人引去看真实星象，不是用坏后果吓人（宪法 §8 红线：不靠编造恐吓）。
//   • 旺(wang) → green：给一个 action（今天去做的事）+ 一句回访校验「你动了吗」。
//                       校验是回溯式的（问她做没做），不是预测——validation 必须对已发生的事。
//   • 平(ping) → plain：给一个 prep（今天可以准备/铺垫的小事），不留空白。
//
// state 严格 1:1 来自 dayWealth().level；intensity 原样透传。lean（表型）从本命盘的
// 火星/土星强弱推出——火星强=出手型(push)、土星强=谨守型(guard)、势均=拉扯型(even)，
// 用来给同一态的文案上一层"这张盘的脾性"，是个性化、不是每天变的东西。
//
// 声音：笃定带温度（宪法 §5）——敢判断，但落点是陪伴而非评判；所有渲染串都过
// money/guardrail 的 validateMoneyCopy（不报数字 / 不捅羞耻 / 不怂恿赌性）。

export type TodayState = "red" | "green" | "plain";

// 火星/土星谁主导这张盘的"用钱脾性"。push=敢出手，guard=守得紧，even=两股劲拉扯。
export type MoneyLean = "push" | "guard" | "even";

export interface TodayVerdict {
  state: TodayState;
  intensity: number; // 0..100，原样透传自 dayWealth().intensity
  lean: MoneyLean;
  line: string;       // 笃定带温度的主判词（每一态都非空）
  quote: string;      // 一句收尾的暖话
  // —— 仅当前态对应的槽位被填充 ——
  doorDate?: string;  // red：yyyy-mm-dd，指向 /wealth?selDay= 当天
  action?: string;    // green：今天去做的事
  askDidYouAct?: string; // green：回访时回溯式校验「你动了吗」
  prep?: string;      // plain：今天可铺垫的小事
}

// ── lean：火星 vs 土星在本命盘的权重（按落宫强弱）。财库宫(2/8)最重，
//    角宫(1/10/4/7)次之，其余轻。差值过阈值才判主导，否则视为拉扯(even)。──
function houseWeight(h: number): number {
  if (h === 2 || h === 8) return 3;   // 财库宫：直接管钱
  if (h === 1 || h === 10) return 2;  // 上升 / 天顶：最显
  if (h === 4 || h === 7) return 1.5; // 其余角宫
  return 0.6;                          // 续宫 / 果宫
}
function bodyWeight(chart: Chart, b: BodyName): number {
  const p = chart.placements.find((x) => x.body === b);
  return p ? houseWeight(p.house) : 0.6;
}
export function moneyLean(chart: Chart): MoneyLean {
  const mars = bodyWeight(chart, "Mars");
  const sat = bodyWeight(chart, "Saturn");
  const diff = mars - sat;
  if (diff > 0.6) return "push";
  if (diff < -0.6) return "guard";
  return "even";
}

function levelToState(level: WealthLevel): TodayState {
  return level === "shen" ? "red" : level === "wang" ? "green" : "plain";
}

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 整数日序：每过一个 UTC 日历日 +1，用来在同一态里轮换文案（相邻日不复读）。
const DAY_MS = 86_400_000;
function dayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}
function pick<T>(pool: T[], ord: number): T {
  return pool[((ord % pool.length) + pool.length) % pool.length];
}

// 每一态 × 每一种 lean 的文案。lean 给同一态上一层"这张盘的脾性"，
// 让出手型和谨守型在同一个旺/慎日读到不一样的语气。每池 ≥2 条、按日轮换。
const RED_LINE: Record<MoneyLean, string[]> = {
  push: ["今天财运偏慎——你这人爱出手，越是手痒越要按一按。", "今天钱上容易冲，你的脾气是想动就动，今天先停一拍。"],
  guard: ["今天财运偏慎——你本就守得稳，今天就顺着这股稳，别被人推着花。", "今天钱上要收着点，你向来不冒进，今天更不必为谁松口。"],
  even: ["今天财运偏慎——你心里那股想动又想守的劲，今天让守的那半赢。", "今天钱上有拉扯，想花和该忍在你这儿打架，今天站忍这边。"],
};
const RED_QUOTE = [
  "慎不是坏日子，是宇宙让你先把钱守住。",
  "今天按住手的人，过两天会谢谢自己。",
  "稳一稳不丢人——你只是没在今天的浪上翻船。",
];

const GREEN_LINE: Record<MoneyLean, string[]> = {
  push: ["今天财运正旺——你本就敢出手，今天这股劲是对的，去推。", "今天钱上有顺风，你这脾气最配这种日子，别犹豫。"],
  guard: ["今天财运正旺——你向来稳，今天可以让自己往前一步，机会是真的。", "今天钱上偏顺，你不爱冒进，但今天值得稳稳地伸一次手。"],
  even: ["今天财运正旺——平时你想动又怕错，今天让想动的那半试一次。", "今天钱上开了道口子，拉扯先放下，顺势走一步。"],
};
const GREEN_ACTION = [
  "该收的款、该谈的薪，今天去开口。",
  "搁着没谈的钱事，今天找人把它落地。",
  "想问的加薪、想催的回款，今天去推一把。",
];
const GREEN_ASK = [
  "我说你今天会动一动钱上的事——你动了吗？",
  "今天该出手的那件事，你去推了吗？",
  "我让你今天去开个口——你做了吗？",
];
const GREEN_QUOTE = [
  "顺的时候出手，是本事，不是运气。",
  "好日子配得上行动的人——你今天有没有配上它。",
  "风是顺的，扬帆的人才接得住。",
];

const PLAIN_LINE: Record<MoneyLean, string[]> = {
  push: ["今天钱上没大事——你爱动，今天把劲攒着，留给该出手的日子。", "今天财运平平，你这股冲劲今天先收进口袋，按计划走。"],
  guard: ["今天钱上没大事，正合你的稳——按你的节奏来就好。", "今天财运平平，你本就不慌，今天踏实过就够了。"],
  even: ["今天钱上没大事——想动想守的拉扯今天歇一歇，按计划走。", "今天财运平平，不用跟自己较劲，平平稳稳过。"],
};
const PLAIN_PREP = [
  "今天可以把这个月的账理一理，给将来的好日子铺路。",
  "今天适合把想谈的钱事先想清楚，等旺日再开口。",
  "今天把要还、要收的列个单子，心里有数就不慌。",
];
const PLAIN_QUOTE = [
  "平淡的日子，是给下一个旺日攒底气。",
  "没风浪的今天，正好把船修一修。",
  "稳稳的一天，也是在替将来省力。",
];

export function todayVerdict(chart: Chart, date: Date): TodayVerdict {
  const w = dayWealth(chart, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const state = levelToState(w.level);
  const lean = moneyLean(chart);
  const ord = dayOrdinal(date);

  if (state === "red") {
    return {
      state,
      intensity: w.intensity,
      lean,
      line: pick(RED_LINE[lean], ord),
      quote: pick(RED_QUOTE, ord),
      doorDate: ymd(date), // 红日必有门，指向当天的 /wealth
    };
  }
  if (state === "green") {
    return {
      state,
      intensity: w.intensity,
      lean,
      line: pick(GREEN_LINE[lean], ord),
      quote: pick(GREEN_QUOTE, ord),
      action: pick(GREEN_ACTION, ord),
      askDidYouAct: pick(GREEN_ASK, ord),
    };
  }
  return {
    state,
    intensity: w.intensity,
    lean,
    line: pick(PLAIN_LINE[lean], ord),
    quote: pick(PLAIN_QUOTE, ord),
    prep: pick(PLAIN_PREP, ord),
  };
}
