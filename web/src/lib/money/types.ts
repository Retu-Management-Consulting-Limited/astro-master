import type { Chart } from "@/lib/astro/chart";

export type MeaningKey = "security" | "status" | "freedom" | "worth" | "control" | "care";
export const MEANING_KEYS: MeaningKey[] = ["security", "status", "freedom", "worth", "control", "care"];

// zh label + the emotional register each meaning speaks to (used by narrative coloring)
export const MEANING_ZH: Record<MeaningKey, { label: string; register: string }> = {
  security: { label: "安全", register: "踏实、不慌、有底气" },
  status: { label: "地位", register: "被看得起、不掉队、拉开身位" },
  freedom: { label: "自由", register: "不被困、能选、敢转向" },
  worth: { label: "我配得上", register: "我值得、可以对自己好" },
  control: { label: "掌控", register: "主动权、掌握自己的命" },
  care: { label: "护住所爱", register: "照顾家人、被爱、安顿" },
};

export type Precision = "exact" | "approx" | "no-time";
export type MeaningRelation = "tension" | "reinforce";

export interface Meaning {
  primary: MeaningKey;
  secondary: MeaningKey;
  relation: MeaningRelation;
}

export interface MoneyPersona {
  meaning: Meaning;
  precision: Precision;
  scores: Record<MeaningKey, number>; // raw scores, exposed for tests/transparency
  strengths: string[]; // 2–4 短语
  blindSpot: string; // 天赋暗面 framing (甩锅星盘)
  styleTag: string; // e.g. 冲动扩张型
}

export type Tone = "wang" | "ping" | "shen";
export type ProphecyType = "window" | "destiny" | "conditional" | "texture";
export type Angle = "opportunity" | "caution" | "recap" | "contrast" | "identity";
export type Weight = "heavy" | "light" | "recap";
export type Beat = "setup" | "tension" | "turn" | "integrate";

// NOTE: Prophecy has NO {amount,date} fields — "不报数字" is enforced at the type level.
export interface Prophecy {
  type: ProphecyType;
  text: string;
}

export interface Chapter {
  transitKey: string; // which transit drives this page
  tone: Tone; // 旺/平/慎
  meaningFacet: MeaningKey;
  prophecyType: ProphecyType;
  angle: Angle;
  themeKey: string; // transitKey + meaningFacet + prophecyType — dedup unit
  weight: Weight; // heavy(真行运) / light(平淡日) / recap(回顾整合)
  arc: { seasonKey: string; beat: Beat };
  hopeNote: string; // deterministic prose (AI may rewrite; this is the fallback)
  prophecy: Prophecy;
}

export type { Chart };
