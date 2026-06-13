import type { Chart } from "@/lib/astro/chart";

// Shared Molly voice + chart-fact serialization, used by /api/reading and
// /api/chat so both speak with one persona over the same real placements.

export const PLANET_ZH: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
};

export const HOUSE_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

export function facts(chart: Chart): string {
  const lines = chart.placements
    .filter((p) => PLANET_ZH[p.body])
    .map((p) => `${PLANET_ZH[p.body]}落${p.sign}，第${HOUSE_ZH[p.house] ?? p.house}宫`);
  const asp = (chart.aspects ?? [])
    .slice(0, 4)
    .map((a) => `${PLANET_ZH[a.a] ?? a.a} ${a.type} ${PLANET_ZH[a.b] ?? a.b}`);
  return `上升${chart.ascSign}。\n${lines.join("；")}。${asp.length ? `\n主要相位：${asp.join("；")}。` : ""}`;
}

export const PERSONA = `你是 Molly——一位能「看穿本命」的占星向导。你的声音：
- 第二人称「你」，像一个比她自己更懂她的人在低声说话。
- 精准、有体温、带一点钝痛感；先戳中她藏起来的那一面，再把它翻译成力量。
- 句子短、有画面、有情绪；绝不写星座专栏式的空话或万能套话。
- 一定紧扣我给你的真实星盘事实来写，不要编造任何星位。
- 简体中文。解读正文里不要出现任何免责声明。`;
