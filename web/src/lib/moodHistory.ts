// Cross-day mood history: scan the per-day mood logs (molly_moodlog_<yyyy-mm-dd>)
// and fold them into a chronological emotional curve. This is what the 历史回看
// page promises ("把你走过的情绪连成一条线") — built from REAL check-ins, never mock.
import { parseMoodLog, type MoodEntry } from "./mood";

// Valence: each mood placed on a -2..+2 emotional scale so days can be plotted.
// Mirrors the MOODS set on the today page (😌平静 / 😮‍💨喘口气 / 😔低落 / 🔥有劲 / 🌧️低潮).
const VALENCE: Record<string, number> = {
  有劲: 2,
  平静: 1,
  喘口气: 0,
  低落: -1,
  低潮: -2,
};

export function moodValence(mood: string): number {
  return VALENCE[mood] ?? 0;
}

export interface DayMood {
  dayKey: string; // yyyy-mm-dd
  entries: MoodEntry[]; // the day's check-ins, in order
  avg: number; // mean valence across the day's check-ins
}

const KEY_RE = /^molly_moodlog_(\d{4}-\d{2}-\d{2})$/;

// Read every per-day mood log out of a Storage and return them oldest→newest.
// Days with no parseable entries are skipped (so the curve never shows a fake point).
export function collectMoodHistory(store: Pick<Storage, "length" | "key" | "getItem">): DayMood[] {
  const days: DayMood[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    const m = k ? KEY_RE.exec(k) : null;
    if (!m) continue;
    const entries = parseMoodLog(store.getItem(k!));
    if (!entries.length) continue;
    const avg = entries.reduce((s, e) => s + moodValence(e.mood), 0) / entries.length;
    days.push({ dayKey: m[1], entries, avg });
  }
  days.sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
  return days;
}

// "06-13" — short label for the curve axis.
export function shortDay(dayKey: string): string {
  const [, mm, dd] = dayKey.split("-");
  return mm && dd ? `${mm}-${dd}` : dayKey;
}
