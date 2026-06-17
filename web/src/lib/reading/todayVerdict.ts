import type { Chart, BodyName } from "../astro/chart";
import { dayWealth, type WealthLevel } from "../astro/wealth";
import { dailyAspect } from "./daily";
import type { TimeBelief } from "../astro/rectify";
import { bodyVerdict, type BodyVerdict } from "./bodyVerdict";

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
// 用来给同一态的文案上一层"这张盘的脾性"，是每张盘固定的一层（不是每天变）。
//
// ⚠️ 个性化粒度（R15）：lean 只有 3 桶，太粗——同一 lean 桶里换盘会让整张今日格
// 逐字节坍缩（A 与 C 都是 even，未接月亮态前 186 个同态日 186 张格全一样）。所以
// 今日格的"盘个性化"不能只靠 lean。这里把当天的真实月亮相位接进来（dailyAspect，
// 来自 daily.ts）：月亮每天移 ~13°，对每张盘的本命点结相位都不同——这是真星象、依盘
// 而变。月亮态(target×quality)给 line 续一句"今天的心情底色"，再把本命月亮经度当 salt
// 折进轮换序号，让同 lean 不同盘的 quote/action/prep/ask 取词也错开。两层叠加后，
// 共享 lean 的两盘在 cell 层每个同态日都不同（content-freshness 登记的最强断言）。
// 仍是"真"不是"编"：所有续句都是月亮相位的真实情绪映射，且全过 money/guardrail。
//
// 声音：笃定带温度（宪法 §5）——敢判断，但落点是陪伴而非评判；所有渲染串都过
// money/guardrail 的 validateMoneyCopy（不报数字 / 不捅羞耻 / 不怂恿赌性）。

export type TodayState = "red" | "green" | "plain";

// 火星/土星谁主导这张盘的"用钱脾性"。push=敢出手，guard=守得紧，even=两股劲拉扯。
export type MoneyLean = "push" | "guard" | "even";

// 今日格主导轨：'钱'=财运轨当主体、'健康'=身心轨当主体。另一条进 chip。
export type Channel = "钱" | "健康";

export interface TodayVerdict {
  state: TodayState;
  intensity: number; // 0..100，原样透传自 dayWealth().intensity
  lean: MoneyLean;
  line: string;       // 笃定带温度的主判词（每一态都非空）
  quote: string;      // 一句收尾的暖话
  natalHit: string;   // 今天月亮点到「你盘里哪个点」的个性化点名——belief 收窄→点名到宫位，宽→只点行星
  // —— 仅当前态对应的槽位被填充 ——
  doorDate?: string;  // red：yyyy-mm-dd，指向 /wealth?selDay= 当天
  action?: string;    // green：今天去做的事
  askDidYouAct?: string; // green：回访时回溯式校验「你动了吗」
  prep?: string;      // plain：今天可铺垫的小事
  // —— T4 双轨：身心轨并入 + 主导 channel（皆 (chart,date) 纯函数、belief-无关）——
  bodyState: TodayState; // 身心三态（与财运同一套红/绿/平），来自 dayBody().level
  body: BodyVerdict;     // 完整身心判词（同一引擎 bodyVerdict，不分叉）
  channel: Channel;      // 当天主导轨：按强度选——主导那条当今日格主体、另一条进 chip
}

// ── 主导 channel 选择（按强度，design/23「谁响谁领头」）─────────────────────
// 强度 = 一轨今天有多「有戏」。red/green 是 charged（有戏），plain 是平淡。
// charge 分：charged 给底分 100，再叠上「离中性 50 的偏离」当细分；plain 只算偏离。
// 谁的 charge 分高谁主导；恰有一轨 charged 时必然是那条（可证伪核）。同分 → 钱（确定性兜底）。
// 纯函数 of (state, intensity)，belief-无关——不动任一轨的 state。
function chargeScore(state: TodayState, intensity: number): number {
  const charged = state !== "plain" ? 100 : 0;
  return charged + Math.abs(intensity - 50);
}
function dominantChannel(
  moneyState: TodayState,
  moneyIntensity: number,
  bodyState: TodayState,
  bodyIntensity: number,
): Channel {
  const money = chargeScore(moneyState, moneyIntensity);
  const body = chargeScore(bodyState, bodyIntensity);
  return body > money ? "健康" : "钱"; // 同分偏向「钱」——确定性、不悬空
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

// 本命月亮经度取整，当作"这张盘"的稳定 salt——不同盘几乎必不同，用来把同 lean 不同盘
// 的轮换序号错开（依盘而变、但同盘恒定）。月亮缺失时退回 0。
function natalSalt(chart: Chart): number {
  const moon = chart.placements.find((p) => p.body === "Moon");
  return moon ? Math.floor(((moon.lon % 360) + 360) % 360) : 0;
}

// 某个本命点（行星名 / ASC / MC）的黄经。给 dailyAspect.target 用。
function natalPointLon(chart: Chart, name: string): number {
  if (name === "ASC") return chart.asc;
  if (name === "MC") return chart.mc;
  return chart.placements.find((p) => p.body === name)?.lon ?? 0;
}
function signIndexOf(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 30) % 12;
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

// ── 月亮态续句：当天行运月亮对这张盘本命点结的相位(target×quality)映成一句"心情底色"。
//    月亮每天移 ~13°、对每张盘的本命点相位都不同——这层是真星象、依盘而变，把同 lean
//    不同盘在 cell 层拉开。纯情绪/陪伴，不报数字、不吓人，全过 money/guardrail。──
type MoodTarget = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Saturn" | "ASC" | "MC";
type MoodQuality = "harm" | "tense";
const MOON_TAIL: Record<MoodTarget, Record<MoodQuality, string>> = {
  Sun: { harm: "今天你心里那点主见是亮的，顺着它走。", tense: "今天容易被人晃了方向，握住自己的就好。" },
  Moon: { harm: "今天情绪稳，做这些刚好不慌。", tense: "今天心绪有点起伏，慢半拍再动也不迟。" },
  Mercury: { harm: "今天脑子顺，盘算这些正清楚。", tense: "今天思绪有点绕，想清楚了再落笔。" },
  Venus: { harm: "今天心是软暖的，做起来也舒服。", tense: "今天容易心软妥协，先按住别急着应。" },
  Mars: { harm: "今天有股使不完的劲，正好使在这上头。", tense: "今天火气偏旺，把这股劲收着点用。" },
  Saturn: { harm: "今天沉得住气，踏实做最对味。", tense: "今天像有副担子压着，别一个人硬扛。" },
  ASC: { harm: "今天状态在线，做这些也更有底气。", tense: "今天容易在意旁人眼光，不必为这分神。" },
  MC: { harm: "今天有人在看着你，做得稳当些。", tense: "今天先别急着摊牌，话留三分。" },
};

// 被月亮点到的"本命点"落在哪个星座，给月亮态再续一缕底色。这层让同 target×quality
// 的两盘也分开——同名点落不同星座（A 与 C 在每个相位撞日上本命点都落不同星座）。
// 12 座各一句短底色，按本命点所在星座取，纯气质描写、不报数字。
const SIGN_FLAVOR = [
  "带着点冲劲。",      // 白羊
  "稳稳地。",          // 金牛
  "脑子转得快。",      // 双子
  "心思偏细。",        // 巨蟹
  "气场敞亮。",        // 狮子
  "讲究分寸。",        // 处女
  "想求个平衡。",      // 天秤
  "藏着股韧劲。",      // 天蝎
  "眼光放远些。",      // 射手
  "踏实往前。",        // 摩羯
  "想换个角度。",      // 水瓶
  "顺着感觉走。",      // 双鱼
] as const;

// ── B×D 闭环 · belief.mode 决定「今天月亮点到你盘里哪个点」点名的精度（不动 state）──
//
// 月亮今天结相位的那个本命点(moon.target)，就是今天给这张盘的个性化落点。怎么"点名"
// 它，取决于 timeBelief 收窄到什么程度——这正是 D(校准) 喂回 B(解读) 的那条线：
//   • mode='planet'（belief 宽，头 2 周典型 / 缺省）：只敢按「行星」点名（你的金星…）。
//     宫位由上升决定，而上升随出生时辰摆 ~1°/4min——时辰没锁住时，谈宫位就是编精度。
//     被点到的是四角(ASC/MC)时更要降级：四角本身就是时辰敏感点，宽 belief 下只说一句
//     通用的"你这张盘"，绝不点宫。planet 必须独立扛、完整不崩（诚实注脚①）。
//   • mode='house'（belief 收窄过阈值，confidence≥0.5）：时辰够准了，才升格按「宫位」
//     点名（你的财帛宫 / 事业宫…）——更具体、更"被看见"。
//
// belief 只换 natalHit 的「具体性」，state(红/绿/平淡) 仍只来自 wealth、与 belief 无关
// （棱角守护 §8 真vs编：校准只收窄时辰精度，不软化情感诚实、不增减红日）。
const PLANET_ZH: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Saturn: "土星",
};
// 财运语境下各宫的"点名"——只在 house-mode（时辰已锁）时使用。
const HOUSE_NAME_ZH: Record<number, string> = {
  1: "命宫", 2: "财帛宫", 3: "兄弟宫", 4: "田宅宫", 5: "子女宫", 6: "奴仆宫",
  7: "夫妻宫", 8: "疾厄宫", 9: "迁移宫", 10: "事业宫", 11: "福德宫", 12: "玄秘宫",
};
function natalPointHouse(chart: Chart, name: string): number | null {
  if (name === "ASC" || name === "MC") return null; // 四角无"落宫"可言
  return chart.placements.find((p) => p.body === name)?.house ?? null;
}
// 默认 belief：宽·planet 模式——缺省调用（现有 today/page、guard 测）走这条，向后兼容。
const PLANET_DEFAULT: Pick<TimeBelief, "mode"> = { mode: "planet" };
function buildNatalHit(chart: Chart, target: string, mode: "planet" | "house"): string {
  if (mode === "house") {
    const h = natalPointHouse(chart, target);
    if (h != null) return `今天月亮照到你的${HOUSE_NAME_ZH[h] ?? `第${h}宫`}`;
    // 四角(ASC/MC)：house 模式下时辰够准，可直说上升/天顶
    if (target === "ASC") return "今天月亮照到你的上升";
    if (target === "MC") return "今天月亮照到你的天顶";
  }
  // planet 模式（含四角降级）：只按行星点名，不碰宫位/上升
  const planet = PLANET_ZH[target];
  if (planet) return `今天月亮照到你的${planet}`;
  return "今天月亮照到你这张盘"; // 四角在 planet 模式下的通用降级，绝不点宫
}

export function todayVerdict(chart: Chart, date: Date, belief?: TimeBelief): TodayVerdict {
  const w = dayWealth(chart, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const state = levelToState(w.level);
  const lean = moneyLean(chart);
  // belief 缺省 → planet 模式（头 2 周典型 + 现有调用）；只取 mode，别的字段不影响 verdict。
  const mode = (belief ?? PLANET_DEFAULT).mode;

  // 真实月亮态：行运月亮对这张盘的本命点结的相位（依盘 + 依日而变）。
  const moon = dailyAspect(chart, date);
  // belief 喂回来的个性化点名：house 模式点到宫位，planet 模式只到行星（不动 state）。
  const natalHit = buildNatalHit(chart, moon.target, mode);
  // 被点到的本命点落在哪个星座，再续一缕底色——让同 target×quality 的两盘也分开。
  const targetSign = signIndexOf(natalPointLon(chart, moon.target));
  const moonTail = `${MOON_TAIL[moon.target as MoodTarget][moon.quality]}${SIGN_FLAVOR[targetSign]}`;

  // 轮换序号：日序（相邻日 +1，保证相邻日错开）+ 本命月亮 salt（同 lean 不同盘错开）。
  const dord = dayOrdinal(date);
  const sord = dord + natalSalt(chart);
  // line 取词用 salted 序号——同 lean 不同盘也会取到不同基句。月亮态(moonTail) + belief
  // 喂回的个性化点名(natalHit) 一起续在主句后：natalHit 随 belief.mode 在 house/planet
  // 间换具体性，所以 belief 收窄时这条 line 会更"点到你身上"——但 state 始终不动。
  const line = (base: string) => `${base}${moonTail}${natalHit}。`;

  // ── T4 双轨：身心判词 + 主导 channel。身心轨完全独立计算（同一 (chart,date) 纯函数、
  //    belief-无关），绝不回写财运的 state/line/intensity——财运字段与旧路径 byte-identical。──
  const body = bodyVerdict(chart, date);
  const channel = dominantChannel(state, w.intensity, body.state, body.intensity);
  const dual = { bodyState: body.state, body, channel };

  if (state === "red") {
    return {
      state,
      intensity: w.intensity,
      lean,
      line: line(pick(RED_LINE[lean], sord)),
      quote: pick(RED_QUOTE, sord),
      natalHit,
      doorDate: ymd(date), // 红日必有门，指向当天的 /wealth
      ...dual,
    };
  }
  if (state === "green") {
    return {
      state,
      intensity: w.intensity,
      lean,
      line: line(pick(GREEN_LINE[lean], sord)),
      quote: pick(GREEN_QUOTE, sord),
      natalHit,
      action: pick(GREEN_ACTION, sord),
      askDidYouAct: pick(GREEN_ASK, sord),
      ...dual,
    };
  }
  return {
    state,
    intensity: w.intensity,
    lean,
    line: line(pick(PLAIN_LINE[lean], sord)),
    quote: pick(PLAIN_QUOTE, sord),
    natalHit,
    prep: pick(PLAIN_PREP, sord),
    ...dual,
  };
}
