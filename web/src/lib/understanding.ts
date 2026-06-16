import { useFunnel } from "./store";

// Honest「懂你度」— replaces the old hardcoded 62%. Every factor is something
// Molly *actually* knows about you, so the number (and its "↑") is truthful:
// it only rises as you give more signal and keep showing up. Capped below 100
// on purpose — Molly never claims to have you fully figured out.
//
// R2 (no placeholder literals) + R4 (no unbacked "越用越准" promise): the meter
// is now a pure function of real persisted state instead of a sticker.
export interface UnderstandingInput {
  /** birth time is exact (not the "我不知道准确时间" path) → a precise chart */
  exactTime: boolean;
  /** calibration questions answered */
  calibrated: boolean;
  /** a first reading has been generated */
  hasFirstRead: boolean;
  /** named / registered */
  hasNickname: boolean;
  /** whole days since the chart was first computed (honest slow growth) */
  daysKnown: number;
  /** 「说中了吗」→ 是这样 count — real feedback that the reading landed */
  confirms: number;
  /** 「说中了吗」→ 其实没有 count — Molly was wrong; the meter must PAY for it (R18④) */
  misses?: number;
  /** distinct days the user actually checked in (verdict or mood) */
  checkins: number;
}

// Calibration term — the ONLY place 说中了吗 feedback moves the meter. It must be able
// to go NEGATIVE: if Molly is wrong, "懂你度" stops rising / dips, so the number is an
// honest accuracy signal, not a one-way sticker (R18④ + anti-self-deception).
// Designed so that with zero misses it reduces EXACTLY to the old `min(10, hits*2)`:
//   hits=1 → +2, hits=3 → +6, hits≥5 → +10 (confidence ramps over the first 5 feedbacks).
export function calibration(hits: number, misses: number): number {
  const h = Math.max(0, hits);
  const m = Math.max(0, misses);
  const fb = h + m;
  if (fb === 0) return 0;
  const hitRate = h / fb;
  const conf = Math.min(fb, 5) / 5; // few data points → smaller swing
  const raw = hitRate >= 0.5 ? (hitRate - 0.5) * 20 : (hitRate - 0.5) * 16; // +10 best, −8 worst
  return Math.round(raw * conf);
}

export function understanding(i: UnderstandingInput): number {
  let v = 26; // floor: you handed Molly a birth chart at all
  if (i.exactTime) v += 12; // exact birth time → an exact ascendant/houses
  if (i.calibrated) v += 10; // you answered the calibration questions
  if (i.hasFirstRead) v += 6; // first read landed
  if (i.hasNickname) v += 8; // you stayed and gave a name
  v += calibration(i.confirms, i.misses ?? 0); // 说中了吗 — can ADD or SUBTRACT
  v += Math.min(8, Math.max(0, i.checkins)); // showing up & telling her things
  v += Math.min(10, Math.max(0, Math.floor(i.daysKnown || 0))); // honest slow growth with days, capped
  return Math.max(18, Math.min(95, Math.round(v))); // floored: she always at least knows your chart
}

const DAY_MS = 86_400_000;

// Hook: derives the live 懂你度 from the funnel store. One source of truth for
// every screen that shows the meter (today / chat / me / history).
export function useUnderstanding(): number {
  const knownTime = useFunnel((s) => s.birthForm?.knownTime ?? false); // true == time UNKNOWN
  const calibrated = useFunnel((s) => !!s.ascCandidate);
  const hasFirstRead = useFunnel((s) => !!s.firstRead);
  const hasNickname = useFunnel((s) => !!s.nickname);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const confirms = useFunnel((s) => s.dailyHits ?? 0);
  const misses = useFunnel((s) => s.dailyMisses ?? 0);
  const checkins = useFunnel((s) => s.checkinDays?.length ?? 0);
  const daysKnown = joinedAt ? Math.floor((Date.now() - joinedAt) / DAY_MS) : 0;
  return understanding({ exactTime: !knownTime, calibrated, hasFirstRead, hasNickname, daysKnown, confirms, misses, checkins });
}
