import type { Chart, Placement } from "@/lib/astro/chart";
import { detectHighlights, type Highlight, type Domain } from "@/lib/astro/highlights";

export interface FirstRead {
  ascSign: string;
  lead: string;
  paragraphs: { text: string; accent?: boolean; catch?: boolean }[];
  quote: string;
  chips: string[];
}

// NOTE: deterministic STUB. Design-accurate, weaves in real placements.
// TODO(key): replace with Claude generation (server route) conditioned on chart + self-model.

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

export function generateFirstRead(chart: Chart, locale: "zh" | "en" = "zh"): FirstRead {
  void locale; // TODO(i18n): en variant authored natively, not translated
  const highlights = detectHighlights(chart);
  const top = (highlights[0]?.domain ?? "self") as Domain;
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
