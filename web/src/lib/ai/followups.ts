// #4 对话后续问题 —— after every Molly reply, offer 2–3 follow-ups so the user is
// never left in silence at an emotionally open moment (the biggest retention leak).
//
// Human-nature rules baked in (see design/DESIGN-SYSTEM.md R18):
//  ③ three DIRECTIONS, not three deeper-digs — give the user control over depth:
//     deep(往里走) / meaning(此刻意义) / act(能动). Never corner them.
//  ① fierceness is EARNED: tone escalates with trust (understanding + turns), so a
//     stranger isn't told brutal truths on turn 1.
//  ⑥ the "act" direction always points toward agency — never leave them in the wound.

export type FollowupDir = "deep" | "meaning" | "act";
export interface Followup {
  text: string;
  dir: FollowupDir;
}

export const DIR_ORDER: FollowupDir[] = ["deep", "meaning", "act"];
export const DIR_LABEL: Record<FollowupDir, string> = { deep: "更深", meaning: "此刻", act: "怎么办" };

// Trust tier 0/1/2 = 温暖 / 敢点破 / 敢说狠话. Fierceness is f(understanding, turns):
// trust accrues both across the relationship (understanding) and within this chat (turns).
export function trustTier(understanding: number, turns: number): 0 | 1 | 2 {
  const score = understanding + Math.min(turns, 6) * 4;
  if (score < 40) return 0;
  if (score < 72) return 1;
  return 2;
}

export const TIER_TONE = ["温暖、克制，像刚认识但已经在意", "敢轻轻点破，比她自己更早看见", "敢说狠话，直戳她藏起来的那一面"] as const;

// Deterministic fallback — used when AI is off or fails, so chips ALWAYS appear.
// Not context-aware (no LLM) but trust-graded and direction-structured. The LLM
// path supplies the context-aware version.
const FALLBACK: Record<FollowupDir, [string, string, string]> = {
  // [tier0 warm, tier1 point, tier2 fierce]
  deep: [
    "这种感觉，最早是从什么时候开始的？",
    "我是不是一直在回避，某个我早就知道的答案？",
    "我是不是一直用「我没事」，把所有人都挡在门外？",
  ],
  meaning: [
    "它在提醒我，什么？",
    "我真正怕的，到底是什么？",
    "我到底在替谁，演这个坚强？",
  ],
  act: [
    "那我可以先为自己，做一件什么小事？",
    "如果不再假装没事，我会怎么做？",
    "我敢不敢，第一次让一个人真的靠近我？",
  ],
};

export function fallbackFollowups(tier: 0 | 1 | 2): Followup[] {
  return DIR_ORDER.map((dir) => ({ dir, text: FALLBACK[dir][tier] }));
}

// Parse the model's output into at most 3 valid follow-ups, one per direction,
// preserving DIR_ORDER. Returns [] on garbage so the caller can fall back.
export function parseFollowups(raw: unknown): Followup[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      arr = JSON.parse(s);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const byDir = new Map<FollowupDir, string>();
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const dir = o.dir;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if ((dir === "deep" || dir === "meaning" || dir === "act") && text.length >= 3 && text.length <= 40 && !byDir.has(dir)) {
      byDir.set(dir, text);
    }
  }
  return DIR_ORDER.filter((d) => byDir.has(d)).map((d) => ({ dir: d, text: byDir.get(d)! }));
}

// Build the LLM instruction for context-aware, trust-graded follow-ups.
export function buildFollowupPrompt(factsText: string, history: string, ta: string, tier: 0 | 1 | 2): string {
  return `${ta}的星盘事实：
${factsText}

你们刚才的对话：
${history}

任务：基于${ta}刚说的和你刚回的，写正好 3 个「${ta}此刻最可能想继续问」的问题，让对话不断。要求：
- 三个方向各一个：① deep=再往里走一层 ② meaning=这对此刻的${ta}意味着什么 ③ act=${ta}能拿它怎么办（一定指向能动、给出路，不要把人留在伤口里）。
- 用${ta}的第一人称口吻写（像${ta}会脱口而出的那句），每个 ≤ 22 字。
- 语气：${TIER_TONE[tier]}。${tier === 2 ? "deep 那个可以是 ta 自己不敢问、却最想知道的。" : ""}
- 紧扣刚才的具体内容，不要泛泛的星座套话。
只输出一个 JSON 数组，无任何其他文字：[{"dir":"deep","text":"…"},{"dir":"meaning","text":"…"},{"dir":"act","text":"…"}]`;
}
