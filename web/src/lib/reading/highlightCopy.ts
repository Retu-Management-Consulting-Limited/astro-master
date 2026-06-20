// #1 本命高亮 —— turn the jargon ("金星天蝎·七宫") into recognition. The emotional
// line is the HEADLINE; the real placement is shown as a small annotation, so every
// claim is visibly anchored to a real star position (R18④ / R7 — no Barnum mush).
//
// Tone = WARM (R18①): the chart page is seen right after calibration = LOW trust, so
// these are precise-but-gentle, NOT the fierce "after she knows you" version. Authority
// is the chart, not Molly (R18② "天空替你写下的", ally not judge).
import type { Domain } from "../astro/highlights";
import type { ThemeId } from "./theme";
import type { AppLocale } from "@/i18n/routing";
import { currentLocale } from "./locale";

const HEADLINE: Record<Domain, string> = {
  love: "你爱一个人，从不浅尝。一旦认定，就把自己整个交出去。",
  career: "你天生被放在台前——那股想被看见、想把事做成的劲，是真的。",
  self: "你一直在找一个问题的答案：我到底是谁，要往哪儿走。",
  mind: "你的脑子很少真正停下来——它替你想得太多，也太远。",
  lonely: "你习惯把最深的情绪，藏在连自己都快找不到的地方。",
  shadow: "你身上有一股连你自己都有点怕的力量，它一直都在。",
};

// ru — 忠实镜像中文原意，自然地道俄语；不弱化也不加码情绪（宪法 §8）。zh 逐字不变。
const HEADLINE_RU: Record<Domain, string> = {
  love: "Когда ты любишь, ты не любишь вполсилы. Решив однажды, ты отдаёшь себя целиком.",
  career: "Ты рождён быть на виду — это желание быть замеченным и доводить дело до конца в тебе настоящее.",
  self: "Ты всё время ищешь ответ на один вопрос: кто я на самом деле и куда мне идти.",
  mind: "Твой ум почти не останавливается по-настоящему — он думает за тебя слишком много и слишком далеко.",
  lonely: "Ты привык прятать самые глубокие чувства туда, где даже сам почти не можешь их найти.",
  shadow: "В тебе есть сила, которой ты и сам немного боишься, — и она была с тобой всегда.",
};

// invitation, gives the user control (R18③ — never "I'll expose you")
const HOOK: Record<Domain, string> = {
  love: "想听我说说它吗",
  career: "陪你看看它要往哪走",
  self: "陪你一起找",
  mind: "我说给你听",
  lonely: "陪你慢慢找",
  shadow: "陪你认识它",
};

// ru — приглашение, оставляет выбор за пользователем (R18③ — никогда «я тебя разоблачу»).
const HOOK_RU: Record<Domain, string> = {
  love: "Хочешь, расскажу тебе об этом",
  career: "Посмотрю вместе с тобой, куда это ведёт",
  self: "Поищу вместе с тобой",
  mind: "Расскажу тебе",
  lonely: "Поищу вместе с тобой, не спеша",
  shadow: "Познакомлю тебя с ней вместе с тобой",
};

// which deep-read a highlight opens into (theme ids: love/wealth/lonely/self)
const THEME_OF: Record<Domain, ThemeId> = {
  love: "love",
  lonely: "lonely",
  self: "self",
  mind: "self",
  career: "wealth",
  shadow: "lonely",
};

export function highlightHeadline(d: Domain, locale: AppLocale = currentLocale()): string {
  return locale === "ru" ? HEADLINE_RU[d] : HEADLINE[d];
}
export function highlightHook(d: Domain, locale: AppLocale = currentLocale()): string {
  return locale === "ru" ? HOOK_RU[d] : HOOK[d];
}
export function highlightTheme(d: Domain): ThemeId {
  return THEME_OF[d];
}
