import type { Chart, Placement } from "@/lib/astro/chart";
import { MEANING_KEYS, MEANING_ZH, type MeaningKey, type Meaning, type MoneyPersona, type Precision } from "./types";

// signIndex: 0白羊 1金牛 2双子 3巨蟹 4狮子 5处女 6天秤 7天蝎 8射手 9摩羯 10水瓶 11双鱼
// Each meaning gets weighted points from: planets in the money houses (2/8),
// the money-ruling planets, and sign emphasis. Deterministic, no I/O.
const SIGN_MEANING: Record<number, MeaningKey> = {
  1: "security", // 金牛
  3: "care", // 巨蟹
  4: "status", // 狮子
  6: "worth", // 天秤(金星)
  7: "control", // 天蝎
  8: "freedom", // 射手
  9: "control", // 摩羯
  10: "freedom", // 水瓶
};
const PLANET_MEANING: Partial<Record<string, MeaningKey>> = {
  Saturn: "security",
  Moon: "care",
  Sun: "status",
  Jupiter: "freedom",
  Venus: "worth",
  Pluto: "control",
  Uranus: "freedom",
  Mars: "freedom",
};
// pairs that pull against each other → relation = tension
const OPPOSED: [MeaningKey, MeaningKey][] = [
  ["freedom", "security"],
  ["status", "care"],
  ["control", "worth"],
];

export function scoreMeanings(chart: Chart): Record<MeaningKey, number> {
  const s = Object.fromEntries(MEANING_KEYS.map((k) => [k, 0])) as Record<MeaningKey, number>;
  const add = (k: MeaningKey | undefined, n: number) => {
    if (k) s[k] += n;
  };
  for (const p of chart.placements as Placement[]) {
    const inMoneyHouse = p.house === 2 || p.house === 8;
    const planetMeaning = PLANET_MEANING[p.body];
    const signMeaning = SIGN_MEANING[p.signIndex];
    // money-house occupants count most; the money planets always count; sign tints.
    if (inMoneyHouse) {
      add(planetMeaning, 3);
      add(signMeaning, 2);
    }
    add(planetMeaning, 1.5);
    add(signMeaning, 0.5);
  }
  // 2nd-house cusp sign emphasis (whole-sign: ascSignIndex + 1)
  const secondSign = (chart.ascSignIndex + 1) % 12;
  add(SIGN_MEANING[secondSign], 2);
  return s;
}

function topTwo(scores: Record<MeaningKey, number>): [MeaningKey, MeaningKey] {
  // deterministic tie-break by MEANING_KEYS order
  const ordered = [...MEANING_KEYS].sort(
    (a, b) => scores[b] - scores[a] || MEANING_KEYS.indexOf(a) - MEANING_KEYS.indexOf(b),
  );
  return [ordered[0], ordered[1]];
}

function relationOf(primary: MeaningKey, secondary: MeaningKey): Meaning["relation"] {
  const opposed = OPPOSED.some(
    ([a, b]) => (a === primary && b === secondary) || (b === primary && a === secondary),
  );
  return opposed ? "tension" : "reinforce";
}

function styleFor(primary: MeaningKey, chart: Chart): string {
  const fast = chart.placements.some((p) => p.body === "Mars" && (p.house === 2 || p.house === 8));
  const base: Record<MeaningKey, string> = {
    freedom: "扩张",
    security: "守成",
    status: "进取",
    worth: "随心",
    control: "掌局",
    care: "顾家",
  };
  return `${fast ? "冲动" : "稳健"}${base[primary]}型`;
}

function strengthsFor(primary: MeaningKey, secondary: MeaningKey): string[] {
  const lib: Record<MeaningKey, string> = {
    freedom: "敢出手",
    security: "稳得住",
    status: "格局大",
    worth: "嗅觉准",
    control: "看得透",
    care: "扛得起",
  };
  return [lib[primary], lib[secondary], "敢转向"];
}

function blindSpotFor(primary: MeaningKey): string {
  const map: Record<MeaningKey, string> = {
    freedom: "你为情绪买单——因为你比别人更敢爱、更敢活。这不是你的错，是你火星的位置。",
    security: "你太想稳，反而错过——这不是胆小，是你太想护住所有人。",
    status: "你怕掉队，容易为面子花——那股劲用对地方，就是你的引擎。",
    worth: "你舍不得对自己好，又忍不住补偿式消费——你只是还没真信自己配得上。",
    control: "你想抓住一切，反被钱绑住——你的深，是天赋也是重量。",
    care: "你把钱都给了别人，留给自己的最少——你的付出，也该有人接住。",
  };
  return map[primary];
}

export function moneyPersona(chart: Chart, precision: Precision = "exact"): MoneyPersona {
  const scores = scoreMeanings(chart);
  const [primary, secondary] = topTwo(scores);
  const meaning: Meaning = { primary, secondary, relation: relationOf(primary, secondary) };
  return {
    meaning,
    precision,
    scores,
    strengths: strengthsFor(primary, secondary),
    blindSpot: blindSpotFor(primary),
    styleTag: styleFor(primary, chart),
  };
}

export { MEANING_ZH };
