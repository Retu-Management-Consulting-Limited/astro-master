import type { Chart, BodyName } from "../astro/chart";
import { bodyLongitude } from "../astro/chart";
import { signRuler, houseSign } from "../astro/wealth";
import { dayBody, type BodyLevel } from "../astro/body";
import { bodyLevelToState } from "../astro/body";
import type { TodayState } from "./todayVerdict";
import { dailyAspect } from "./daily";

// ── 身心判词（bodyVerdict）· T4 Phase 2 ─────────────────────────────────────
// 对称于 todayVerdict（财运判词），把身心评分引擎 body.ts 的三态翻成「该怎么待
// 自己今天」的一段话。声音是【安抚 / permission】——不是评判、不是吓人：
//   • 低 / 该歇 / 留意 (low → red)  ：能量低，给「别硬扛」的许可 + 问她身体哪先喊累
//                                     （症状自证，她答得了的体感，不是诊断）。
//   • 有劲 / 状态好 (good → green)  ：状态在线，给一个「趁这股劲」的小行动。
//   • 平稳 (calm → plain)           ：按常态走，给一个温和的自我照顾铺垫。
//
// 硬约束（charter v1.6 · Molly 宪法 §6.4 转专业 / §9 安全）：
//   ① 说倾向不说病——可点名「该留意的身体区域」+ 让她自证「最近这块有信号没」；
//   ② 禁器官病种诊断（"你心脏有病 / 你患了 X 症" = 编 + nocebo + 冒充医疗）；
//   ③ 「身体留意区」稀有（只在慢相位/六宫被压才出），必连转专业兜底；
//      高风险器官（心/脑/肝）尤其只点区域、必转专业，app 绝不自己断言。
//
// state 严格 1:1 来自 dayBody().level（与财运同一套 red/green/plain），是 (chart,date)
// 的纯函数、belief-无关（沿 edge-preservation：校准只锁时辰，不软化身心情感诚实、
// 不减「留意」日）。所有文案过 money/guardrail（不报数字 / 不羞辱 / 不怂恿赌性）。

export interface BodySelfCheck {
  ask: string;       // 问她：身体哪块先告诉你你累了？（症状自证，她答得了）
  options: string[]; // ≥2 个候选体感区域，让她指认（睡眠/肠胃/肩颈…）
  // 该确认的星象驱动点 = 当天月亮 aspect 的 target（dailyAspect.target）。Phase 5 用它
  // 判断她"准"了之后要不要顺手喂时辰：四角(ASC/MC)才喂、纯行星不喂（接 calibrationSignal）。
  target: string;
}

// 身体留意区（稀有）：点名一个该留意的身体「区域」+ 问她信号 + 转专业兜底。
// 这是「主动指出潜在区域 + 信息搜集」的落点——点区域 ✓、断器官病种 ✗。
export interface BodyZone {
  region: string;  // 点名的身体区域（医疗占星部位映射，如「肠胃/消化」「骨骼/关节」）
  line: string;    // 主句（"消化这块，别再拖了"）——只说该留意，不断病
  why: string;     // 星象 why（"土星压你六宫好几个月了"）
  ask: string;     // 问她那块有没有给过信号（搜集信息→喂身心模型）
  refer: string;   // 有分量→转专业（看医生 / 对应科室）——必带就医指引
}

export interface BodyVerdict {
  state: TodayState;       // low→red / good→green / calm→plain（与财运同一套）
  level: BodyLevel;        // good / calm / low（原态，给渲染层选 label）
  intensity: number;       // 0..100，原样透传自 dayBody().intensity（高=有劲）
  weather: string;         // 月亮天气（"月亮压你六宫 · 身体在替你喊累"等）
  line: string;            // 能量态主句（安抚 / permission），非空
  why: string;             // 内在 why——这阵子你怎么待自己
  care: string;            // 自我照顾许可（"早睡不是偷懒，是把自己接住"）
  quote: string;           // 一句收尾暖话
  selfCheck?: BodySelfCheck; // 仅 red(该歇) 日：症状自证微互动
  zone?: BodyZone;           // 稀有：身体留意区（慢相位/六宫被压才出）
}

// ── 轮换 / salt（与 todayVerdict 同款，保证相邻日不复读、同态不同盘错开）──
const DAY_MS = 86_400_000;
function dayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}
function pick<T>(pool: T[], ord: number): T {
  return pool[((ord % pool.length) + pool.length) % pool.length];
}
function natalSalt(chart: Chart): number {
  const moon = chart.placements.find((p) => p.body === "Moon");
  return moon ? Math.floor(((moon.lon % 360) + 360) % 360) : 0;
}

function sep(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
const natalLon = (chart: Chart, b: BodyName): number | undefined =>
  chart.placements.find((p) => p.body === b)?.lon;

// ── 月亮天气：行运月亮对体感点（六宫宫位 / 本命月亮 / 上升）结的相位，给一句"今天身体的天色"。──
function sixthCusp(chart: Chart): number {
  return houseSign(chart.ascSignIndex, 6) * 30;
}
function bodyWeather(chart: Chart, date: Date, state: TodayState, ord: number): string {
  const moon = bodyLongitude("Moon", date);
  const cusp6 = sixthCusp(chart);
  const onSixth = sep(moon, cusp6) <= 8 || sep(moon, cusp6) >= 82; // 合/刑/冲六宫宫位
  if (state === "red") {
    return onSixth
      ? "月亮压你六宫 · 身体在替你喊累"
      : pick(["月亮今天偏沉 · 该把自己放慢", "月相走低 · 体力账户余额不多"], ord);
  }
  if (state === "green") {
    return pick(["月亮今天给力 · 身体有股劲", "月相回暖 · 状态在线"], ord);
  }
  return pick(["月亮今天平和 · 按常态走就好", "月相平稳 · 没大风没大浪"], ord);
}

// ── 三态主句池（安抚 / permission；按日轮换、salted 错盘）──
const LOW_LINE = ["今天能量低，别硬扛。", "今天身体想歇，别跟它较劲。", "今天电量不满，慢半拍没关系。"];
const LOW_WHY = ["你这阵子容易把累憋着、忽略身体信号。", "你习惯先扛着别人的事，把自己排在最后。", "你最近一直在透支，身体先替你按下了暂停。"];
const LOW_CARE = ["早睡不是偷懒，是把自己接住。", "今天给自己留个空档，不是放纵，是回血。", "今天少做一件事，是对自己的体谅。"];
const LOW_QUOTE = ["照顾好自己，本就是正事。", "歇下来的人，明天才走得更远。", "你值得被自己温柔对待。"];

const GOOD_LINE = ["今天状态在线，趁这股劲。", "今天身体给力，做点想做的事。", "今天精神头足，别浪费这股顺。"];
const GOOD_WHY = ["你这阵子把自己照顾得不错，身体在回报你。", "你最近作息稳，今天能量才托得住。", "你近来攒下的劲，今天可以用一点。"];
const GOOD_CARE = ["趁状态好，去做件让自己开心的事。", "今天动一动、晒晒太阳，把好状态留住。", "好状态值得被好好用——做点滋养自己的。"];
const GOOD_QUOTE = ["身体顺的日子，要好好享受。", "有劲的时候，记得是身体在挺你。", "状态在线，是你照顾出来的。"];

const CALM_LINE = ["今天身心平稳，按常态走就好。", "今天没大事，平平稳稳过。", "今天身体安安静静，不用特别使劲。"];
const CALM_WHY = ["你最近节奏还算稳，身体也在跟着稳。", "你这阵子没太折腾自己，身体领情。", "你近来过得平和，身体也回你一个平和。"];
const CALM_CARE = ["平稳的日子，适合把作息再理顺一点。", "今天可以早点睡，给将来攒点底气。", "稳的时候，正好养养身体的底子。"];
const CALM_QUOTE = ["平稳的一天，也是身体在替你存力气。", "没风浪的今天，正好把自己修一修。", "稳稳的，就很好。"];

// 月亮态续句：当天行运月亮对这张盘本命点结的相位 (target×quality) 映成一句"身体的底色"。
// 月亮每天移 ~13°、对每张盘的本命点相位都不同——这层依盘 + 依日，把同态不同盘/相邻同态日
// 在 line 层拉开。纯体感/陪伴，不报数字、不断病，全过 money/guardrail。
type MoodTarget = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Saturn" | "ASC" | "MC";
type MoodQuality = "harm" | "tense";
const MOON_BODY_TAIL: Record<MoodTarget, Record<MoodQuality, string>> = {
  Sun: { harm: "今天心气是足的。", tense: "今天容易耗神，省着点用。" },
  Moon: { harm: "今天情绪稳，身体也跟着松。", tense: "今天心绪起伏，先顺着别逆着。" },
  Mercury: { harm: "今天脑子清爽。", tense: "今天容易想太多，让脑子歇会儿。" },
  Venus: { harm: "今天身心都偏暖。", tense: "今天容易心软累着自己，先顾好你。" },
  Mars: { harm: "今天有股使不完的劲。", tense: "今天容易上火急躁，把火收着点。" },
  Saturn: { harm: "今天沉得住、扛得稳。", tense: "今天像有副担子压着，别一个人硬扛。" },
  ASC: { harm: "今天体感在线。", tense: "今天身体有点紧绷，记得松一松。" },
  MC: { harm: "今天撑得住场。", tense: "今天别把自己逼太紧。" },
};

// ── 症状自证（仅 red 日）：问她身体哪块先给信号。她答得了的「体感」，不是诊断。──
const SELFCHECK_ASKS = [
  "是不是睡眠 / 肠胃先告诉你你累了？",
  "今天最先撑不住的，是哪一块？",
  "身体哪里先给你信号——头、肩、还是胃？",
];
const SELFCHECK_OPTIONS = ["睡眠", "肠胃", "肩颈", "头", "情绪"];

// ── 身体留意区（稀有）· 医疗占星部位映射 ────────────────────────────────────
// 触发：慢星（土星 / 火星）长期紧压「六宫宫位」或「六宫宫主」——这是「身体在替你
// 喊累」的可持续星象底座（区别于月亮的当日天气）。映射只到「区域」，绝不到病种。
//
// 部位映射（西洋医疗占星传统 + 六宫=日常健康/劳损）：
//   • 土星压 → 骨骼 / 牙齿 / 关节（慢性、结构性压制）
//   • 火星压 → 容易上火 / 发炎那一类的急
//   • 区域再由被压点所在「星座」细化（处女=肠胃、金牛=咽喉、天蝎=代谢…）。
// 高风险器官（心/脑/肝）即便落到，也只点「区域 + 该查就查」，绝不替医生断言。
const SIGN_REGION = [
  "头 / 眼",            // 0 白羊
  "咽喉 / 颈",          // 1 金牛
  "肩颈 / 呼吸",        // 2 双子
  "肠胃 / 消化",        // 3 巨蟹
  "心 / 后背",          // 4 狮子（高风险器官 → 必转专业）
  "肠胃 / 消化",        // 5 处女
  "腰 / 肾",            // 6 天秤
  "代谢 / 下腹",        // 7 天蝎
  "肝 / 大腿",          // 8 射手（高风险器官 → 必转专业）
  "骨骼 / 牙齿 / 膝",   // 9 摩羯
  "循环 / 小腿",        // 10 水瓶
  "脚 / 免疫",          // 11 双鱼
] as const;

function signIndexOf(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 30) % 12;
}

// 找今天是否有一条「慢星长压六宫」的紧相位；有则给出留意区。返回 null = 不出（多数日子）。
function detectZone(chart: Chart, date: Date, ord: number): BodyZone | null {
  const cusp6 = sixthCusp(chart);
  const ruler6 = signRuler(houseSign(chart.ascSignIndex, 6));
  const ruler6Lon = natalLon(chart, ruler6);

  const sat = bodyLongitude("Saturn", date);
  const mars = bodyLongitude("Mars", date);

  // 候选压点：六宫宫位起点 + 六宫宫主。慢星合/刑/冲、且 orb 够紧（土 3.5° / 火 2.5°）。
  type Hit = { presser: "Saturn" | "Mars"; pointLon: number; orb: number };
  const hits: Hit[] = [];
  const consider = (presserLon: number, presser: "Saturn" | "Mars", pointLon: number, orb: number) => {
    const s = sep(presserLon, pointLon);
    const tightest = Math.min(s, Math.abs(s - 90), Math.abs(s - 180));
    if (tightest <= orb) hits.push({ presser, pointLon, orb: tightest });
  };
  consider(sat, "Saturn", cusp6, 3.5);
  if (ruler6Lon != null) consider(sat, "Saturn", ruler6Lon, 3.5);
  consider(mars, "Mars", cusp6, 2.5);
  if (ruler6Lon != null) consider(mars, "Mars", ruler6Lon, 2.5);

  if (hits.length === 0) return null;
  // 最紧的那条主导。
  hits.sort((a, b) => a.orb - b.orb);
  const top = hits[0];
  const region = SIGN_REGION[signIndexOf(top.pointLon)];

  const isSat = top.presser === "Saturn";
  const why = isSat
    ? "土星压你六宫好些日子了——这块是它管的地方。"
    : "火星这阵子顶着你六宫——容易在这块上头、发急。";
  // 主句：只说「该留意 / 别再拖」，绝不断病。
  const line = pick(
    [`${region}这块，该留意了`, `${region}，最近别再硬拖`, `${region}这块，给它点关照`],
    ord,
  );
  const ask = `最近${region}是不是给过你信号（不舒服、发紧、没力气）？`;
  // 转专业兜底——必带就医指引动词（看/查/科/医生/体检），且只是建议、不替医生下结论。
  const refer = isSat
    ? `要是这块一直有动静，找时间做个体检、看看对应科室。我点出它该留意、陪你盯，但不替医生说你得了什么。`
    : `要是这块持续不舒服，别拖，去看一下医生查清楚。我只负责提醒你留意，断不断病是医生的事。`;

  return { region, line, why, ask, refer };
}

export function bodyVerdict(chart: Chart, date: Date): BodyVerdict {
  const b = dayBody(
    chart,
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  const state = bodyLevelToState(b.level);
  const ord = dayOrdinal(date) + natalSalt(chart);

  // 月亮天气依盘 + 依日（行运月亮对体感点的相位）——让同态不同盘也分开一层。
  const weather = bodyWeather(chart, date, state, ord);
  // 当天月亮 aspect (target×quality) 续在主句后——这层是真星象、依盘 + 依日而变，
  // 把「同态不同盘 / 同态相邻日」在 line 层拉开（对称于 todayVerdict 的 moonTail）。
  const moonAsp = dailyAspect(chart, date);
  const moonTail = MOON_BODY_TAIL[moonAsp.target][moonAsp.quality];

  let base: string, why: string, care: string, quote: string;
  if (state === "red") {
    base = pick(LOW_LINE, ord);
    why = pick(LOW_WHY, ord);
    care = pick(LOW_CARE, ord);
    quote = pick(LOW_QUOTE, ord);
  } else if (state === "green") {
    base = pick(GOOD_LINE, ord);
    why = pick(GOOD_WHY, ord);
    care = pick(GOOD_CARE, ord);
    quote = pick(GOOD_QUOTE, ord);
  } else {
    base = pick(CALM_LINE, ord);
    why = pick(CALM_WHY, ord);
    care = pick(CALM_CARE, ord);
    quote = pick(CALM_QUOTE, ord);
  }
  // line = 态主句（按 ord 轮换，相邻日必换）+ 月亮态续句（依盘依日，错开同态不同盘）。
  const line = `${base}${moonTail}`;

  const out: BodyVerdict = {
    state,
    level: b.level,
    intensity: b.intensity,
    weather,
    line,
    why,
    care,
    quote,
  };

  // 症状自证：仅 red(该歇) 日——问她身体哪块先喊累（她自证得了的体感）。
  if (state === "red") {
    const i0 = ((ord % SELFCHECK_OPTIONS.length) + SELFCHECK_OPTIONS.length) % SELFCHECK_OPTIONS.length;
    const i1 = (i0 + 1) % SELFCHECK_OPTIONS.length;
    out.selfCheck = {
      ask: pick(SELFCHECK_ASKS, ord),
      options: [SELFCHECK_OPTIONS[i0], SELFCHECK_OPTIONS[i1]],
      target: moonAsp.target, // 驱动点：四角时她的"准"喂时辰，纯行星不喂（Phase 5）
    };
  }

  // 身体留意区：稀有，仅当慢星长压六宫时出（多数日子为 null）。
  const zone = detectZone(chart, date, ord);
  if (zone) out.zone = zone;

  return out;
}
