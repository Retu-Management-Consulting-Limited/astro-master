import type { Chart, Placement } from "@/lib/astro/chart";
import type { AppLocale } from "@/i18n/routing";
import { SIGNS, HOUSES } from "@/i18n/glossary";
import { detectHighlights, type Highlight, type Domain } from "@/lib/astro/highlights";

const SIGN_ZH_TO_RU: Record<string, string> = Object.fromEntries(
  Object.values(SIGNS).map((v) => [v.zh, v.ru]),
);

export interface FirstRead {
  ascSign: string;
  lead: string;
  paragraphs: { text: string; accent?: boolean; catch?: boolean }[];
  quote: string;
  chips: string[];
}

// Deterministic baseline reading — design-accurate, weaves in real placements.
// Serves as the instant render AND the fallback when AI is off/unavailable.
// Real Molly readings come from /api/reading (see lib/reading/remote.ts).

const find = (c: Chart, b: string) => c.placements.find((p) => p.body === b) as Placement;

const QUOTE: Record<Domain, string> = {
  lonely: "在外面这些年，你最大的本事，是让所有人都以为你不需要任何人。",
  love: "你要的从不是浅浅的喜欢，是彻底的交融。",
  career: "你不是野心大，是你天生就该站在高处。",
  self: "你一直在找的那个答案，其实你早就知道，只是不敢承认。",
  mind: "你脑子从不肯停，可你最需要的，是允许自己什么都不想。",
  shadow: "你藏起来的那一面，不是缺点，是你还没敢用的力量。",
};

const CHIPS: Record<Domain, string[]> = {
  lonely: ["为什么我宁愿自己扛，也不肯求人？", "我到底属于哪里？", "会有一个，接得住我的人吗？"],
  love: ["为什么我总爱上不确定的人？", "怎么不被一段感情消耗掉自己？", "他到底懂不懂我？"],
  career: ["我适不适合现在换条路？", "我的不可替代性到底是什么？", "今年我该出手吗？"],
  self: ["我这辈子到底想要什么？", "为什么我总在自我怀疑？", "怎么活成我自己？"],
  mind: ["怎么停下我的内耗？", "为什么我想太多？", "我该信直觉还是逻辑？"],
  shadow: ["我在害怕什么？", "我压抑了什么？", "怎么和自己的暗面和解？"],
};

// ── ru variants (i18n 子项目 C / M3) — Molly's Russian voice, same real placements.
// 宪法 §8「真 vs 编」: 照见真实月亮位置，不夸大/不编造。zh below is byte-unchanged.
const QUOTE_RU: Record<Domain, string> = {
  lonely: "За все эти годы вдали твой главный талант — заставить всех поверить, что тебе никто не нужен.",
  love: "Тебе нужна не лёгкая симпатия, а полное слияние.",
  career: "Дело не в честолюбии — ты от рождения создана стоять высоко.",
  self: "Ответ, который ты всё ищешь, ты давно знаешь — просто не смеешь признать.",
  mind: "Твой ум не желает останавливаться — а нужнее всего тебе позволить себе ни о чём не думать.",
  shadow: "Та сторона, что ты прячешь, — не изъян, а сила, которой ты ещё не решилась воспользоваться.",
};

const CHIPS_RU: Record<Domain, string[]> = {
  lonely: ["Почему я скорее вынесу всё сама, чем попрошу о помощи?", "Где же моё место?", "Будет ли тот, кто сможет меня подхватить?"],
  love: ["Почему я всегда влюбляюсь в тех, в ком не уверена?", "Как не растратить себя в отношениях?", "Понимает ли он меня вообще?"],
  career: ["Подходит ли мне сейчас сменить путь?", "В чём именно моя незаменимость?", "Стоит ли мне действовать в этом году?"],
  self: ["Чего я на самом деле хочу в этой жизни?", "Почему я вечно в себе сомневаюсь?", "Как мне стать собой?"],
  mind: ["Как остановить мою внутреннюю гонку?", "Я что, слишком много думаю?", "Чему верить — интуиции или логике?"],
  shadow: ["Чего я боюсь?", "Что я в себе подавила?", "Как примириться со своей тёмной стороной?"],
};

function firstReadRu(chart: Chart, top: Domain): FirstRead {
  const moon = find(chart, "Moon");
  const ruSign = SIGN_ZH_TO_RU[moon.sign] ?? moon.sign;
  const ruHouse = HOUSES[String(moon.house)]?.ru ?? `Дом ${moon.house}`;
  const paragraphs: FirstRead["paragraphs"] = [
    { text: `Со стороны у тебя «всё хорошо» — и друзья есть, и с людьми ладишь. Только ты сама знаешь, как это «хорошо» выматывает.`, accent: true },
    { text: `Ты не сильная — у тебя просто не было выбора. Ты слишком рано поняла: просить бесполезно — и перестала просить.` },
    {
      text: `☽ Луна в твоём ${ruSign}, ${ruHouse} — ты запираешь чувства в самой дальней комнате и ключ не даёшь даже себе. Это не капризы, ты держала это слишком долго.`,
    },
    { text: `Поэтому ${top === "love" || top === "lonely" ? "в любви" : "при людях"} ты всегда первой понимаешь других. Потому что быть понятой ты давно перестала ждать.`, catch: false },
  ];
  return {
    ascSign: chart.ascSign,
    lead: "Давай для начала снимем эту скорлупу.",
    paragraphs,
    quote: QUOTE_RU[top] ?? QUOTE_RU.self,
    chips: CHIPS_RU[top] ?? CHIPS_RU.self,
  };
}

export function generateFirstRead(chart: Chart, locale: AppLocale = "zh"): FirstRead {
  const highlights = detectHighlights(chart);
  const top = (highlights[0]?.domain ?? "self") as Domain;
  if (locale === "ru") return firstReadRu(chart, top);

  const moon = find(chart, "Moon");
  const sun = find(chart, "Sun");

  const paragraphs: FirstRead["paragraphs"] = [
    { text: `你过得"挺好的"——朋友圈好、跟人聊也好。只有你自己知道，那个"好"有多累。`, accent: true },
    { text: `你不是坚强，你是没得选。你太早就明白：求助没用，于是干脆，不求了。` },
    {
      text: `☽ 月亮落在你的${moon.sign}、${moon.house}宫——你把情绪锁进最深的房间，钥匙连自己都不给。不是矫情，是你扛了太久。`,
    },
    { text: `所以${top === "love" || top === "lonely" ? "在感情里" : "在人前"}，你永远先懂别人。因为"被懂"，你早就不敢期待了。`, catch: false },
  ];

  return {
    ascSign: chart.ascSign,
    lead: "我们先把那层壳，撕掉。",
    paragraphs,
    quote: QUOTE[top] ?? QUOTE.self,
    chips: CHIPS[top] ?? CHIPS.self,
  };
}

export { detectHighlights };
export type { Highlight };
