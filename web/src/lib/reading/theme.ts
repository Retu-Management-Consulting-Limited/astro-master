import type { Chart, BodyName, Placement } from "@/lib/astro/chart";

// 主题深度解读 — deterministic baseline woven with the user's real placements.
// Instant render + fallback; real readings come from /api/reading, which keeps
// this scaffold's placement facts and swaps only the prose.

export type ThemeId = "love" | "wealth" | "lonely" | "self";

export interface ThemeRead {
  id: ThemeId;
  title: string;
  glyph: string;
  planetLabel: string; // e.g. ♀金星天蝎 · 第七宫
  paragraphs: { text: string; accent?: boolean; catch?: boolean }[];
  chips: string[];
  quote: string;
  deepRead: string; // 「更深一层」— the real crux, chart-anchored. Gated (honest gating §3.6):
                    // free at 懂你度≥72 (越用越准), or the variabl-ready paywall slot.
}

const HOUSE_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

// One essence phrase per sign — woven into theme-specific frames.
const ESSENCE: Record<string, string> = {
  白羊: "直接而炽热，不爱绕弯",
  金牛: "沉稳，认定了就不轻易松手",
  双子: "轻盈又善变，怕闷",
  巨蟹: "柔软而念旧，记得每个细节",
  狮子: "热烈，渴望被真正看见",
  处女: "细腻，总想把一切修到刚好",
  天秤: "讲究分寸与体面，怕失衡",
  天蝎: "深刻而决绝，要么全部要么没有",
  射手: "向往自由，眼睛总望着远方",
  摩羯: "克制能扛，把脆弱藏得很深",
  水瓶: "疏离又清醒，习惯抽身去看",
  双鱼: "易感能共情，界限常常模糊",
};

const CFG: Record<ThemeId, { title: string; glyph: string; planet: BodyName; cnPlanet: string }> = {
  love: { title: "感情与关系", glyph: "♀", planet: "Venus", cnPlanet: "金星" },
  wealth: { title: "财富与时机", glyph: "♃", planet: "Jupiter", cnPlanet: "木星" },
  lonely: { title: "孤独与归属", glyph: "☽", planet: "Moon", cnPlanet: "月亮" },
  self: { title: "自我与方向", glyph: "☉", planet: "Sun", cnPlanet: "太阳" },
};

const QUOTE: Record<ThemeId, string> = {
  love: "你要的从不是浅浅的喜欢，是彻底的交融。",
  wealth: "你的钱，跟着你的胆走——不是跟着运气走。",
  lonely: "你最大的本事，是让所有人都以为你不需要任何人。",
  self: "你一直在找的那个答案，其实你早就知道，只是不敢承认。",
};

const CHIPS: Record<ThemeId, string[]> = {
  love: ["为什么我总爱上不确定的人？", "怎么不被一段感情消耗掉自己？"],
  wealth: ["今年我该出手吗？", "我的钱总留不住，是为什么？"],
  lonely: ["为什么我宁愿自己扛，也不肯求人？", "会有一个接得住我的人吗？"],
  self: ["我这辈子到底想要什么？", "怎么活成我自己？"],
};

const find = (c: Chart, b: BodyName) => c.placements.find((p) => p.body === b) as Placement;

// theme-specific 3-paragraph frame: how it shows / the fear / the reframe.
function paragraphs(id: ThemeId, sign: string, house: number, essence: string): ThemeRead["paragraphs"] {
  const houseZh = `第${HOUSE_ZH[house] ?? house}宫`;
  switch (id) {
    case "love":
      return [
        { text: `你在感情里，${essence}。这股劲落在${houseZh}，意味着关系对你从不是点缀，而是你确认自己存在的方式。` },
        { text: `所以你最怕的从不是被拒绝，是「不确定」。模糊，比分手更折磨你。`, accent: true },
        { text: `这不是你太作，是你爱得太真。别为了好相处，把自己改小。`, catch: true },
      ];
    case "wealth":
      return [
        { text: `你对钱与机会的嗅觉${essence}。它落在${houseZh}，说明你的财来自你敢不敢在对的时刻押上自己，而不是死守。` },
        { text: `你真正的风险，从不是亏钱，是因为想太稳，错过了那个本该属于你的窗口。`, accent: true },
        { text: `该出手时别犹豫，但功课要做足——你的运气，向来奖励有准备的胆。`, catch: true },
      ];
    case "lonely":
      return [
        { text: `你安放情绪的方式${essence}。月亮落在${houseZh}，你早就学会把需要别人这件事，悄悄收起来。` },
        { text: `于是你成了那个总在接住别人的人，却很少问：谁来接住我？`, accent: true },
        { text: `独立是你的盔甲，但偶尔卸下它，不是软弱——是给愿意靠近你的人，一个机会。`, catch: true },
      ];
    case "self":
      return [
        { text: `你内核的底色${essence}。太阳落在${houseZh}，你这一生真正的功课，是把这股能量活出来，而不是藏起来。` },
        { text: `你常常自我怀疑，不是因为你不够好，是因为你总用别人的尺，量自己的路。`, accent: true },
        { text: `方向其实你早就知道，只是还没敢承认。允许自己想要，是第一步。`, catch: true },
      ];
  }
}

// 「更深一层」— one level past the 3 paragraphs: the actual crux, anchored to the
// house. Genuinely deeper (not 伪深刻 §4.3, not fabricated §4.2), so gating it is honest.
function deepReadOf(id: ThemeId, houseZh: string): string {
  switch (id) {
    case "love":
      return `再往深一层：你怕的不是孤独，是「被看清之后，还是不够」。金星落${houseZh}的人，总在对方真正走近前，先递出一道考验——把"我值不值得被爱"留给每段关系替你回答。真正卡住你的，是你从没敢自己先回答它。`;
    case "wealth":
      return `再往深一层：你对钱的不安，根子不在钱——是你不信"稳稳的好"会落到你头上。木星落${houseZh}，你的财气在"敢押自己"那一下；可你卡在"押了万一错，就证明我不行"。你守的从不是钱，是那个怕被否定的自己。`;
    case "lonely":
      return `再往深一层：你不是不需要人，是太早学会了"需要=危险"。月亮落${houseZh}，你把求助和"被嫌弃"焊在了一起。卡住你的不是没人靠近，是有人靠近时你先关上门——关门的疼你能控制，被推开的疼你不能。`;
    case "self":
      return `再往深一层：你迟迟不敢选，不是没方向，是怕"选了真正想要的、却没做到"。太阳落${houseZh}，你的功课是把这股能量活出来；可你卡在"万一这就是我的全部、还是不够亮"。你不是不知道要什么，是不敢承认你配得上它。`;
  }
}

export function generateThemeRead(chart: Chart, id: ThemeId): ThemeRead {
  const cfg = CFG[id];
  const p = find(chart, cfg.planet);
  const sign = p?.sign ?? "—";
  const house = p?.house ?? 1;
  const essence = ESSENCE[sign] ?? "有你自己的节奏";
  return {
    id,
    title: cfg.title,
    glyph: cfg.glyph,
    planetLabel: `${cfg.glyph}${cfg.cnPlanet}${sign} · 第${HOUSE_ZH[house] ?? house}宫`,
    paragraphs: paragraphs(id, sign, house, essence),
    chips: CHIPS[id],
    quote: QUOTE[id],
    deepRead: deepReadOf(id, `第${HOUSE_ZH[house] ?? house}宫`),
  };
}

export const THEME_IDS: ThemeId[] = ["love", "wealth", "lonely", "self"];
