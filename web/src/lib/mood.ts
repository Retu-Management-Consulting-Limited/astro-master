// Per-day mood LOG: each check-in records {mood, ts}, multiple times a day, so a
// user can capture how they felt at different moments (not one overwriteable value).
export interface MoodEntry {
  mood: string;
  ts: number; // epoch ms of the check-in
}

const CAP = 12; // keep at most this many entries per day
const DEDUP_MS = 60_000; // ignore the same mood re-tapped within 60s (accidental double-tap)

export function parseMoodLog(raw: string | null): MoodEntry[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((e): e is MoodEntry => !!e && typeof e.mood === "string" && typeof e.ts === "number");
  } catch {
    return [];
  }
}

// Append a check-in. Drops an accidental identical double-tap; caps to the last CAP.
export function appendMood(log: MoodEntry[], mood: string, ts: number): MoodEntry[] {
  const last = log[log.length - 1];
  if (last && last.mood === mood && ts - last.ts < DEDUP_MS) return log; // accidental repeat
  return [...log, { mood, ts }].slice(-CAP);
}

export function moodLogKey(dayKey: string): string {
  return `molly_moodlog_${dayKey}`;
}

// "HH:MM" local time, for the day's timeline display.
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
