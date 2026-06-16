// #2 深度解读 —— the relationship layer on top of the (stable) fact layer.
// P1 feeds the keystone's mood signal in two honest places:
//   • a memory PREFACE: Molly reads this theme "with the current you in mind"
//   • the deep gate: replaces the paywall stub with epistemic honesty (R18④) —
//     she withholds the deeper layer because she's not sure she knows you yet,
//     not behind a quota/paywall.
import type { MoodTrend } from "../model/userModel";

export interface MoodSignal {
  trend: MoodTrend;
  lowStreak: number;
}

// Warm acknowledgment of the user's REAL recent mood (their own check-ins). Returns
// null when there's no signal — never fabricate a memory (R18 honesty / no-mock).
export function memoryPreface(mood: MoodSignal): string | null {
  if (mood.lowStreak >= 2) return "这几天，你一直往下沉——我把这篇，也对着此刻这样的你，重新读一遍。";
  if (mood.trend === "up") return "这几天你像在慢慢缓过来——带着这股劲，我们再看一遍。";
  return null;
}

export interface HonestGate {
  headline: string;
  sub: string;
  note: string;
}

// The deep-layer gate, reframed from「付费解锁」to「认知诚实」(R18④). The path to the
// deeper layer is RELATIONSHIP (tell her more), not payment — so it points to chat.
export function honestGate(understanding: number): HonestGate {
  const u = Math.round(understanding);
  return {
    headline: "🤫 这底下还有一层——我还不敢说",
    sub:
      u >= 75
        ? `我懂你 ${u}% 了，已经挺熟——再多跟我说说你的事，我就敢往这层走。`
        : `我才懂你 ${u}%，怕说错，反而伤着你。多跟我说说，我会越来越敢说。`,
    note: "不是门槛，是我不想瞎猜你",
  };
}
