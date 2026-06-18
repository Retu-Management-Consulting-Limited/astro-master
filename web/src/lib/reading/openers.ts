// #3 预设问题 —— the chat's opening suggestions. The old hardcoded openers
// (["我最近有点焦虑","聊聊我的感情","我该怎么决定一件事"]) were IDENTICAL for everyone
// — exactly the 反巴纳姆 failure the constitution §3.1 names. These are personalized
// to THIS chart's strongest life-area, phrased as the user's own wound/curiosity.
//
// Constitution honored: §3.1 specific-not-generic (anchored to the chart's top domain),
// §6.5 triggers are curiosity / self-identity, NEVER fear (no "再不看就错过/厄运" copy),
// §4 first-person intimate voice. R18②: it's the user's own question, not a verdict.
import { detectHighlights, type Domain } from "@/lib/astro/highlights";
import type { Chart } from "@/lib/astro/chart";
import type { AppLocale } from "@/i18n/routing";

// wound/curiosity questions per life-area — the thing this person actually lies awake on
const OPENERS_BY_DOMAIN: Record<Domain, string[]> = {
  love: ["为什么我总在感情里，先把自己掏空？", "他到底懂不懂我？", "我还敢，再相信一次吗？"],
  lonely: ["为什么我宁愿自己扛，也不肯求人？", "我到底属于哪里？", "会有一个，接得住我的人吗？"],
  career: ["我是不是，该换条路了？", "我的不可替代，到底是什么？", "今年，我该出手吗？"],
  self: ["我这辈子，到底想要什么？", "为什么我总在自我怀疑？", "怎么才能，活成我自己？"],
  mind: ["怎么才能停下，我的内耗？", "我是不是，想太多了？", "该信直觉，还是信逻辑？"],
  shadow: ["我到底，在害怕什么？", "我压抑了什么，没敢说出口？", "怎么和自己的暗面，和解？"],
};

// ru variants (i18n 子项目 C / M3) — same wound/curiosity questions in Molly's
// Russian voice (§6.5 curiosity/identity triggers, never fear). zh byte-unchanged.
const OPENERS_BY_DOMAIN_RU: Record<Domain, string[]> = {
  love: ["Почему я в любви вечно опустошаю себя первой?", "Понимает ли он меня вообще?", "Решусь ли я поверить ещё раз?"],
  lonely: ["Почему я скорее вынесу всё сама, чем попрошу о помощи?", "Где же моё место?", "Будет ли тот, кто сможет меня подхватить?"],
  career: ["Не пора ли мне сменить путь?", "В чём именно моя незаменимость?", "Стоит ли мне действовать в этом году?"],
  self: ["Чего я на самом деле хочу в этой жизни?", "Почему я вечно в себе сомневаюсь?", "Как мне стать собой?"],
  mind: ["Как остановить мою внутреннюю гонку?", "Я что, слишком много думаю?", "Чему верить — интуиции или логике?"],
  shadow: ["Чего же я боюсь?", "Что я подавила и не решилась сказать вслух?", "Как примириться со своей тёмной стороной?"],
};

// The chart's strongest life-area (the highest-scored highlight), defaulting to self.
export function topDomain(chart: Chart): Domain {
  return detectHighlights(chart)[0]?.domain ?? "self";
}

// 3 opener questions for THIS user. Prefer their own first-read chips (already
// personalized — AI-bespoke when the model is on); otherwise derive from the chart's
// strongest domain. Never the old one-size-fits-all list.
export function chatOpeners(chart: Chart, firstReadChips?: string[], locale: AppLocale = "zh"): string[] {
  if (firstReadChips && firstReadChips.length >= 2) return firstReadChips.slice(0, 3);
  const table = locale === "ru" ? OPENERS_BY_DOMAIN_RU : OPENERS_BY_DOMAIN;
  return table[topDomain(chart)] ?? table.self;
}

// exported for tests / reuse
export { OPENERS_BY_DOMAIN, OPENERS_BY_DOMAIN_RU };
