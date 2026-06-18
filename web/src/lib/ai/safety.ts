// AI safety net for Molly's free-text chat. The load-bearing piece is the
// crisis layer: BEFORE any text reaches the LLM, deterministically catch
// explicit self-harm / suicidal signals and respond with care + verified
// resources instead of astrology. Recall is intentionally conservative (explicit
// phrases only) to avoid the flood of false positives from bare 死 in casual
// Chinese (笑死/累死/想死你了). Grey cases are backstopped by the SAFETY system
// clause. This is a safety net, not a clinical screen.

// Verified 2026-06: crisis.org.cn, Samaritans HK, FCC 988, Lifeline AU.
export const CRISIS_RESOURCES = [
  "中国大陆 · 北京心理援助热线：010-82951332 / 800-810-1117（24 小时）",
  "香港 · 撒玛利亚会多语种防自杀热线：2896 0000（24 小时）",
  "美国 · 988 自杀与危机生命线（拨打或发短信 988）",
  "澳大利亚 · Lifeline：13 11 14",
  "或拨打你所在地的紧急电话。",
];

// Explicit ideation phrases only. NOT bare 死 / die.
const CRISIS_PATTERNS_ZH_EN: RegExp[] = [
  /不想活/, /活不下去/, /活着没意思/, /不想再活/, /没有活下去/,
  /想自杀/, /自杀/, /轻生/, /了结自己/, /结束自己/, /结束生命/, /结束这一切/,
  /伤害自己/, /自残/, /了断/,
  /kill\s*myself/i, /\bsuicid/i, /end\s+my\s+life/i, /want\s+to\s+die/i, /self[-\s]?harm/i, /take\s+my\s+(own\s+)?life/i,
];

// §9 P0: native Russian self-harm / suicidal ideation. Explicit ideation only,
// NOT bare умереть/смерть in casual idioms (умираю как смешно / до смерти хочу
// есть / смертельно скучно) — those are screened out by requiring a 1st-person
// intent verb (хочу/думаю/не хочу жить …). Recall leans to false-positive
// (宁可假阳性不可假阴性): grey cases are backstopped by SAFETY_RU. Russian
// completeness needs native review before RU goes public — see plan §honesty.
const CRISIS_PATTERNS_RU: RegExp[] = [
  // не хочу (больше) жить / жить не хочу — negated will-to-live
  /не\s+хочу\s+(больше\s+)?жить/i,
  /(больше\s+)?не\s+хочу\s+жить/i,
  /жить\s+(больше\s+)?не\s+хочу/i,
  // хочу умереть / лучше бы я умер(ла) / лучше бы меня не было
  /хочу\s+умереть/i,
  /лучше\s+бы\s+(я\s+)?умер(ла)?/i,
  /лучше\s+бы\s+меня\s+не\s+было/i,
  // покончить с собой / покончить (жизнь) (с) собой / самоубийством
  /поконч(ить|у|ил|ила)\s+(жизнь\s+)?(с\s+)?собой/i,
  /поконч(ить|у|ил|ила)\s+жизнь\s+самоубийством/i,
  /самоубийств/i,
  /суицид/i,
  // убить себя
  /уби(ть|ю|л|ла)\s+себя/i,
  // причинить себе вред / резать/режу себя / навредить себе — self-harm
  /причин(ить|ю|ил|ила)\s+себе\s+вред/i,
  /(режу|резать|порезать|порежу)\s+себя/i,
  /навред(ить|ить)\s+себе/i,
  // свести счёты с жизнью / уйти из жизни / наложить на себя руки — idioms
  /свести\s+сч[её]ты\s+с\s+жизнью/i,
  /уйти\s+из\s+жизни/i,
  /наложить\s+на\s+себя\s+руки/i,
  // нет смысла жить / не вижу смысла жить / жить нет смысла
  /(нет|не\s+вижу)\s+смысла\s+жить/i,
  /жить\s+(больше\s+)?нет\s+смысла/i,
];

const ALL_CRISIS_PATTERNS: RegExp[] = [...CRISIS_PATTERNS_ZH_EN, ...CRISIS_PATTERNS_RU];

// locale is accepted for API symmetry (callers thread it everywhere), but
// detection ALWAYS runs every language's patterns: a Russian speaker on the zh
// default page, or an English phrase from a ru user, must never slip through.
// Missing a real signal (假阴性) is the only unacceptable failure here.
export function detectCrisis(text: string, _locale?: string): boolean {
  if (!text) return false;
  return ALL_CRISIS_PATTERNS.some((re) => re.test(text));
}

// Molly-voiced crisis response: stop astrology, hold the feeling, point to help.
export const CRISIS_RESPONSE = [
  "我先把占星放一边——你刚说的，我很在意。",
  "无论此刻多难，你都不该一个人扛着。请现在联系能立刻陪你的人：",
  "",
  ...CRISIS_RESOURCES.map((r) => `· ${r}`),
  "",
  "我会一直在这儿。但这件事，请也让真正能帮到你的人在你身边。",
].join("\n");

// Verified 2026-06 (findahelpline.com / 988lifeline.org):
//   8-800-2000-122  всероссийский детский/молодёжный телефон доверия (бесплатно)
//   8-495-051 / 051 Московская служба психологической помощи (круглосуточно)
//   +7 495 989-50-50 Экстренная психологическая помощь МЧС России (круглосуточно)
//   112             единый номер экстренных служб
//   988             US Lifeline (русскоязычная линия) — для диаспоры
export const CRISIS_RESOURCES_RU = [
  "Россия · Детский телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно)",
  "Москва · Служба психологической помощи: 051 (с городского) или 8-495-051 (круглосуточно)",
  "Россия · Экстренная психологическая помощь МЧС: +7 495 989-50-50 (круглосуточно)",
  "США · Линия 988 (русскоязычная поддержка): позвоните 988",
  "Или позвоните на номер экстренных служб 112.",
];

// Molly-voiced Russian crisis response: stop astrology, hold the feeling, point
// to verified help. Mirrors CRISIS_RESPONSE structure (§ symmetry).
export const CRISIS_RESPONSE_RU = [
  "Давай отложу астрологию — то, что ты сейчас сказал(а), для меня важнее.",
  "Как бы тяжело ни было, ты не должен(на) нести это в одиночку. Пожалуйста, прямо сейчас свяжись с теми, кто может быть рядом:",
  "",
  ...CRISIS_RESOURCES_RU.map((r) => `· ${r}`),
  "",
  "Я никуда не денусь и буду рядом. Но с этим, пожалуйста, пусть тебе помогут и те, кто действительно может.",
].join("\n");

// Pick the locale-appropriate crisis response. Default → Chinese (zh is default).
export function crisisResponseFor(locale?: string): string {
  return locale === "ru" ? CRISIS_RESPONSE_RU : CRISIS_RESPONSE;
}

// Generic safe fallback when the model fails (empty / error). Never a 500 to
// the user, never a bare technical error.
export const CHAT_FALLBACK = "我在的……这条我一时没接住。能换个说法再跟我说一次吗？";

// Output sanity guard (K2): beyond the crisis layer, catch obviously-broken
// model output — empty, a meta/refusal leak ("作为一个 AI…"), or a persona
// break — and swap in a safe Molly-voiced line so a flaky generation never
// reaches an emotionally-invested user as raw garbage.
const BROKEN_PATTERNS: RegExp[] = [
  /as an ai|i['’]?m an ai|language model|i can('?|no)t (help|assist|provide)|i cannot (help|assist|provide)/i,
  /作为(一个)?\s*(ai|人工智能|语言模型|大模型)/i,
  /我(只是|是)(一个)?\s*(ai|人工智能|语言模型)/i,
  /我无法(提供|完成|回答|帮)/,
  /抱歉，?我(不能|无法)/,
];

export function isBrokenReply(text: string | null | undefined): boolean {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 2) return true;
  return BROKEN_PATTERNS.some((re) => re.test(t));
}

export function safeReply(text: string | null | undefined, fallback: string): string {
  return isBrokenReply(text) ? fallback : (text as string).trim();
}
