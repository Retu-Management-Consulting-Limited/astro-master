// Pure birth date/time validation — shared by /input (client) and /api/geocode
// (server). No store / DOM / server-only deps so both sides import it.
// Fixes: future / 1900-before / extreme years (M6, L1) and out-of-range
// month/day/time (N2, e.g. month=99, time=99:99).

export const MIN_BIRTH_YEAR = 1900;

export function validDateParts(year: number, month: number, day: number, nowMs = Date.now()): boolean {
  if (![year, month, day].every(Number.isInteger)) return false;
  if (year < MIN_BIRTH_YEAR) return false;
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;
  // No future birth dates.
  const now = new Date(nowMs);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (Date.UTC(year, month - 1, day) > today) return false;
  return true;
}

export function validTimeParts(hour: number, minute: number): boolean {
  return (
    Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
  );
}

// Validate "YYYY-MM-DD" (+ optional "HH:mm"). Time is optional (noon default).
export function validBirthDateTime(date: string, time?: string | null, nowMs = Date.now()): boolean {
  const [y, mo, d] = (date || "").split("-").map(Number);
  if (!validDateParts(y, mo, d, nowMs)) return false;
  if (time == null || time === "") return true;
  if (!/^\d{1,2}:\d{2}$/.test(time)) return false;
  const [h, mi] = time.split(":").map(Number);
  return validTimeParts(h, mi);
}
