// keystone — Molly's REAL accumulating memory of you, folded from local signals only
// (your own check-ins; nothing leaves the device). The four outlets + the honest
// 懂你度 all read from this. P1 uses the no-NLP signals (mood log + 说中了吗 +
// days); chat-derived life-context is a later layer (design doc §1).
import { understanding } from "../understanding";
import { type DayMood } from "../moodHistory";

export type MoodTrend = "down" | "up" | "flat";

export interface UserModel {
  understanding: number; // honest 懂你度 (can dip when Molly is wrong)
  trust: { hits: number; misses: number; hitRate: number };
  mood: { dominant: string | null; trend: MoodTrend; lowStreak: number; days: number };
  daysActive: number;
}

export interface UserSignals {
  exactTime: boolean;
  calibrated: boolean;
  hasFirstRead: boolean;
  hasNickname: boolean;
  daysKnown: number;
  hits: number;
  misses: number;
  checkins: number;
  moodDays: DayMood[]; // collectMoodHistory(localStorage), oldest → newest
}

const TREND_EPS = 0.4; // avg-valence delta that counts as a real swing

// Recent emotional direction: compare the most-recent days against the prior block.
export function moodTrend(days: DayMood[]): MoodTrend {
  if (days.length < 2) return "flat";
  const recent = days.slice(-3);
  const earlier = days.slice(-6, -3);
  const mean = (a: DayMood[]) => a.reduce((s, x) => s + x.avg, 0) / a.length;
  const delta = earlier.length ? mean(recent) - mean(earlier) : recent[recent.length - 1].avg - recent[0].avg;
  return delta > TREND_EPS ? "up" : delta < -TREND_EPS ? "down" : "flat";
}

// How many of the most-recent consecutive days were net-negative (avg < 0).
export function lowStreak(days: DayMood[]): number {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].avg < 0) n++;
    else break;
  }
  return n;
}

// The mood the user logs most often across all days.
export function dominantMood(days: DayMood[]): string | null {
  const count = new Map<string, number>();
  for (const d of days) for (const e of d.entries) count.set(e.mood, (count.get(e.mood) ?? 0) + 1);
  let best: string | null = null;
  let bc = 0;
  for (const [m, c] of count) if (c > bc) { bc = c; best = m; }
  return best;
}

export function buildUserModel(sig: UserSignals): UserModel {
  const fb = Math.max(0, sig.hits) + Math.max(0, sig.misses);
  return {
    understanding: understanding({
      exactTime: sig.exactTime,
      calibrated: sig.calibrated,
      hasFirstRead: sig.hasFirstRead,
      hasNickname: sig.hasNickname,
      daysKnown: sig.daysKnown,
      confirms: sig.hits,
      misses: sig.misses,
      checkins: sig.checkins,
    }),
    trust: { hits: sig.hits, misses: sig.misses, hitRate: fb ? Math.max(0, sig.hits) / fb : 0 },
    mood: {
      dominant: dominantMood(sig.moodDays),
      trend: moodTrend(sig.moodDays),
      lowStreak: lowStreak(sig.moodDays),
      days: sig.moodDays.length,
    },
    daysActive: Math.max(0, sig.checkins),
  };
}
