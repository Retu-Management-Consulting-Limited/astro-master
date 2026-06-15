// Biorhythm — a deterministic, *pseudoscientific* (entertainment) model: three sine
// waves keyed ONLY off the whole-day count since birth. NOT astrology, NOT medical.
// Framed in-product as a playful self-awareness mirror, covered by the app's
// AI/entertainment disclaimer. We never phrase it as a medical/predictive instruction.
export type RhythmKey = "physical" | "emotional" | "intellectual";
export type Rhythm = Record<RhythmKey, number>; // each value in [-1, 1]

// classic biorhythm periods (days)
export const PERIODS: Record<RhythmKey, number> = { physical: 23, emotional: 28, intellectual: 33 };
export const RHYTHM_KEYS: RhythmKey[] = ["physical", "emotional", "intellectual"];

// whole local-calendar days from birth → target (UTC-noon-free integer day diff, so
// DST never shifts it). >= 0 for any valid (non-future) birth.
export function daysSinceBirth(birth: Date, target: Date): number {
  const a = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function biorhythm(birth: Date, target: Date): Rhythm {
  const t = daysSinceBirth(birth, target);
  return {
    physical: Math.sin((2 * Math.PI * t) / PERIODS.physical),
    emotional: Math.sin((2 * Math.PI * t) / PERIODS.emotional),
    intellectual: Math.sin((2 * Math.PI * t) / PERIODS.intellectual),
  };
}

export interface RhythmPoint {
  offset: number; // days from center (negative = past)
  rhythm: Rhythm;
}

// A window of [-span, +span] days around `center`, for the mini-curve.
export function biorhythmSeries(birth: Date, center: Date, span = 7): RhythmPoint[] {
  const pts: RhythmPoint[] = [];
  for (let d = -span; d <= span; d++) {
    const day = new Date(center.getFullYear(), center.getMonth(), center.getDate() + d);
    pts.push({ offset: d, rhythm: biorhythm(birth, day) });
  }
  return pts;
}

// epsilon-aware sign: sin() lands on ~1e-16 at its mathematical zeros, so snap tiny
// magnitudes to 0 rather than trusting an exact === 0.
function sgn(v: number): -1 | 0 | 1 {
  if (Math.abs(v) < 1e-9) return 0;
  return v > 0 ? 1 : -1;
}

// Dimensions whose curve crosses zero ON `target` — the traditional 临界日 (the curve
// passing through zero = that dimension is at its most volatile). Flagged when today is
// the zero, or when the sign flips between two non-zero days (so the day AFTER a zero
// isn't double-counted).
export function criticalDims(birth: Date, target: Date): RhythmKey[] {
  const today = biorhythm(birth, target);
  const yest = biorhythm(birth, new Date(target.getFullYear(), target.getMonth(), target.getDate() - 1));
  return RHYTHM_KEYS.filter((k) => {
    const t = sgn(today[k]);
    const y = sgn(yest[k]);
    return t === 0 || (y !== 0 && t !== y);
  });
}

// value in [-1,1] → integer percent for display
export function pct(v: number): number {
  return Math.round(v * 100);
}

// parse a stored "yyyy-mm-dd" birth date into a LOCAL Date (midnight), matching how
// dayKey() reasons about calendar days.
export function parseBirthDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
