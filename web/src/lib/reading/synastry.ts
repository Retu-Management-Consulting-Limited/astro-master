import type { SynResult, RelType } from "@/lib/astro/synastry";

// Per-RelType deterministic synastry reading. Replaces the old 5-type-shared
// mad-lib (synastry/page.tsx reading()), whose "得有一个人先松口" catch-line was
// flat-out wrong for colleagues/friends. Serves two jobs (mirrors lib/reading
// theme/generate): the INSTANT render before the LLM lands, and the graceful
// FALLBACK when AI is off / rate-limited / errors. Even the fallback is per-type
// — never a shared template, or mad-lib isn't actually dead.
//
// Voice: D5 (狠一点) within Constitution §8.1 (狠 from the REAL low dimension, not
// fabricated) and §10 (every catch-line still points at an agency move — who
// speaks up / who softens — never leaves the pair only in the wound).

export interface SynRead {
  vibe: string;
  body: string;
  catchLine: string;
}

const strip = (label: string) => label.replace(/^[^一-龥]+/, ""); // drop the emoji prefix

interface Tmpl {
  vibe: (hn: string, ln: string) => string;
  body: (p: { hn: string; hv: number; ln: string; lv: number }) => string;
  catchLine: (hn: string, ln: string) => string;
}

const BANK: Record<RelType, Tmpl> = {
  lover: {
    vibe: (hn, ln) => `${hn}够烈，但${ln}是你们的暗礁`,
    body: ({ hn, hv, ln, lv }) => `你俩最烈的是「${hn}」——${hv} 分，一碰就来电。可「${ln}」只有 ${lv}：这块补不上，再烫的火也会凉。`,
    catchLine: (_hn, ln) => `你俩不会输给不爱，会输给都太硬——谁都赌对方先在「${ln}」上低头。`,
  },
  partner: {
    vibe: (hn, ln) => `${hn}能成事，但${ln}是你们的雷区`,
    body: ({ hn, hv, ln, lv }) => `你俩最值钱的是「${hn}」——${hv} 分，搭起来真能赚钱。可「${ln}」只有 ${lv}：这点不摊开，分钱那天就翻脸。`,
    catchLine: (_hn, ln) => `你俩的死穴不是能力，是「${ln}」从没讲清——不讲，迟早把彼此拖死。`,
  },
  colleague: {
    vibe: (hn, ln) => `${hn}能配合，但${ln}是你们的内耗源`,
    body: ({ hn, hv, ln, lv }) => `你俩最顺的是「${hn}」——${hv} 分，事能往前推。可「${ln}」只有 ${lv}：这条不划清，合作越久越互相磨。`,
    catchLine: (_hn, ln) => `你俩不会败给能力，会败给「${ln}」没人先说破——憋着，迟早互相消耗。`,
  },
  friend: {
    vibe: (hn, ln) => `${hn}够深，但${ln}是你们的隐患`,
    body: ({ hn, hv, ln, lv }) => `你俩最真的是「${hn}」——${hv} 分，是能交心的底。可「${ln}」只有 ${lv}：这块不顾，处久了会悄悄磨没。`,
    catchLine: (_hn, ln) => `你俩不会散于没感情，会散于「${ln}」——总有人忍着不说，忍到不想再忍。`,
  },
  family: {
    vibe: (hn, ln) => `${hn}还在，但${ln}是你们的旧伤`,
    body: ({ hn, hv, ln, lv }) => `你俩最深的是「${hn}」——${hv} 分，是血里的牵。可「${ln}」只有 ${lv}：这道伤没解，再亲也会刺到彼此。`,
    catchLine: (_hn, ln) => `你俩不缺爱，缺的是「${ln}」上谁先松口——都端着，就一直疼下去。`,
  },
};

export function synScaffold(result: SynResult, _selfName?: string, _otherName?: string): SynRead {
  const dims = [...result.dims].sort((a, b) => b.value - a.value);
  const hi = dims[0];
  const lo = dims[dims.length - 1];
  const hn = strip(hi.label);
  const ln = strip(lo.label);
  const t = BANK[result.type];
  return {
    vibe: t.vibe(hn, ln),
    body: t.body({ hn, hv: hi.value, ln, lv: lo.value }),
    catchLine: t.catchLine(hn, ln),
  };
}
