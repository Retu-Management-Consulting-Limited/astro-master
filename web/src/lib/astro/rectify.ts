import { anglesAt, bodyLongitude, type BirthInput, type BodyName } from "./chart";

// ── Birth-time rectification ──────────────────────────────────────────────
// Molly never *knows* the user's exact birth minute. Most people give an hour,
// a "morning", or nothing. But the natal angles (ASC/MC) sweep ~1°/4min with
// birth time, and life's big events (a move, a job, a relationship) tend to land
// when a slow transit contacts one of those angles. So we can run it backwards:
// for each candidate birth hour, recompute the angles and ask "how tightly did
// this person's real events hit the angles *under this hour*?". Hours where many
// events line up score high → a belief distribution over the birth hour.
//
// This is "真 via 对天象" (constitution §5.2 — astrology as a mirror, not a
// fortune-machine): we infer the hour from things that actually happened to her,
// we don't invent a birth time. And we never claim certainty — the distribution
// is capped below confidence=1 (Phase 2 honesty footnote ③: behaviour+events
// reveal the truth she lives, they don't grant god-view).
//
// Per the available engine we only have `bodyLongitude` (transit positions) — no
// secondary progressions — so the "event signal" is the transiting structural
// planets (Saturn/Jupiter) at the event date. That is a deliberately conservative
// rectifier: good enough to narrow an hour, never enough to pin a minute.

export interface LifeEvent {
  kind: "move" | "career" | "relationship" | "health" | "family";
  year: number;
  month?: number; // a "half-filled" event has no month — Phase 6 备战糖 fills it later
}

export interface TimeBelief {
  buckets: number[];          // 24 hour-bucket weights, Σ = 1
  topRange: [number, number]; // strongest contiguous hour band [startHour, endHour], wrap-aware
  confidence: number;         // 0..1 (sharper distribution → higher), strictly < 1
  mode: "planet" | "house";   // confidence ≥ HOUSE_THRESHOLD → house, else planet
}

const HOURS = 24;
export const HOUSE_THRESHOLD = 0.5;
// Hard ceiling on confidence — we never pretend to *know* the minute. Even an
// arbitrarily corroborated belief tops out here (honesty footnote ③).
const CONFIDENCE_CEILING = 0.92;

// Slow structural transits mark life's turning points; we read them as the
// "event signal" that should be touching an angle at the true birth hour.
const EVENT_BODIES: BodyName[] = ["Saturn", "Jupiter"];

// aspect families the event transit can make to an angle (hard + soft)
const ASPECT_ANGLES = [0, 60, 90, 120, 180];

function norm360(d: number) {
  return ((d % 360) + 360) % 360;
}
function sep(a: number, b: number) {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return Math.min(d, 360 - d);
}

// A date to read the event's transits at. Half-filled events (no month) read at
// mid-year so a later month-completion (Phase 6 refine) genuinely shifts the
// signal — the partial vs full event are NOT the same input.
function eventDate(e: LifeEvent): Date {
  const month = e.month ?? 7; // mid-year stand-in until completed
  return new Date(Date.UTC(e.year, month - 1, 15, 12, 0));
}

// How tightly does this event hit the angles under a given candidate hour?
// 1 = exact angle contact, decaying to 0 by ORB degrees. Take the best
// (tightest) hit across {Saturn,Jupiter} × {ASC,MC} × aspect family.
const ORB = 6;
function eventHitScore(birth: BirthInput, e: LifeEvent, hour: number): number {
  const { asc, mc } = anglesAt(birth, hour, 0);
  const date = eventDate(e);
  let best = 0;
  for (const body of EVENT_BODIES) {
    const tl = bodyLongitude(body, date);
    for (const angleLon of [asc, mc]) {
      const s = sep(tl, angleLon);
      for (const a of ASPECT_ANGLES) {
        const orb = Math.abs(s - a);
        if (orb < ORB) best = Math.max(best, 1 - orb / ORB);
      }
    }
  }
  return best;
}

// Shannon-entropy → peakedness, normalized to [0,1]. Uniform → 0, a single spike
// → ~1. We then scale by event corroboration and clamp below 1.
function peakedness(buckets: number[]): number {
  const n = buckets.length;
  let h = 0;
  for (const p of buckets) if (p > 0) h -= p * Math.log(p);
  const hMax = Math.log(n);
  if (hMax === 0) return 0;
  return 1 - h / hMax; // 0 (uniform) .. 1 (spike)
}

// The "已锁到 X 小时内" detective band: a window centered on the peak hour whose
// HALF-WIDTH shrinks as confidence rises. Tying the band width to confidence (and
// not to a fixed mass quantile) is what makes narrowing *monotonic*: because
// every added corroborating event can only raise confidence, the band can only
// tighten — it never re-widens just because a flatter event smeared the mass.
// At confidence 0 the band is the whole 24h; at the ceiling it's ±1h.
function topRange(buckets: number[], confidence: number): [number, number] {
  const n = buckets.length;
  let peak = 0;
  for (let i = 1; i < n; i++) if (buckets[i] > buckets[peak]) peak = i;
  // half-width: 12h (whole clock) at conf 0 → 1h at conf 1
  const half = Math.max(1, Math.round((1 - confidence) * (n / 2)));
  if (half >= n / 2) return [0, n - 1];
  const lo = (peak - half + n) % n;
  const hi = (peak + half) % n;
  return [lo, hi];
}

export function rectify(birth: BirthInput, events: LifeEvent[]): TimeBelief {
  // No events → we know nothing about the hour: flat prior, planet mode.
  if (events.length === 0) {
    const flat = new Array<number>(HOURS).fill(1 / HOURS);
    return { buckets: flat, topRange: [0, HOURS - 1], confidence: 0, mode: "planet" };
  }

  // Cross-narrowing: a candidate hour is only believable if *every* event hits
  // the angles under it. Multiply per-event scores (AND), with a small floor so
  // one unlucky event can't zero the whole hour. Then normalize.
  const raw = new Array<number>(HOURS).fill(0);
  for (let h = 0; h < HOURS; h++) {
    let prod = 1;
    for (const e of events) prod *= 0.05 + eventHitScore(birth, e, h);
    raw[h] = prod;
  }
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  const buckets = raw.map((x) => x / total);

  // Confidence rests on TWO things, with corroboration load-bearing:
  //   • corroboration — how many independent events constrain the hour. This is
  //     strictly increasing in event count, which is what makes the detective
  //     band narrow *monotonically* (more events can only tighten, never widen).
  //   • peakedness — how cleanly those events agree on one hour, used only to
  //     modulate within the corroboration envelope (0.5..1), so a messy event
  //     can lower certainty a little but can't reverse the narrowing.
  // Capped below 1 — we never claim to know the minute (honesty footnote ③).
  const corroboration = 1 - 1 / (events.length + 1); // 1 ev→0.5, 2→0.67, 3→0.75…
  const confidence = Math.min(CONFIDENCE_CEILING, corroboration * (0.5 + 0.5 * peakedness(buckets)));

  return {
    buckets,
    topRange: topRange(buckets, confidence),
    confidence,
    mode: confidence >= HOUSE_THRESHOLD ? "house" : "planet",
  };
}
