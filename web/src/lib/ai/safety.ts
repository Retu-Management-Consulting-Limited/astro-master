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
const CRISIS_PATTERNS: RegExp[] = [
  /不想活/, /活不下去/, /活着没意思/, /不想再活/, /没有活下去/,
  /想自杀/, /自杀/, /轻生/, /了结自己/, /结束自己/, /结束生命/, /结束这一切/,
  /伤害自己/, /自残/, /了断/,
  /kill\s*myself/i, /\bsuicid/i, /end\s+my\s+life/i, /want\s+to\s+die/i, /self[-\s]?harm/i, /take\s+my\s+(own\s+)?life/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  return CRISIS_PATTERNS.some((re) => re.test(text));
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

// Generic safe fallback when the model fails (empty / error). Never a 500 to
// the user, never a bare technical error.
export const CHAT_FALLBACK = "我在的……这条我一时没接住。能换个说法再跟我说一次吗？";
