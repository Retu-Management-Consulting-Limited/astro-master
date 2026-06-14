// Historical-correct timezone math, zero runtime deps for the offset part.
//
// The load-bearing fact for a natal chart is the UTC offset *at the birth
// instant* — not a city's "current" offset. DST and historical rule changes
// (e.g. China observed DST 1986–1991) move the Ascendant by ~15°/hour. We get
// this right by reading the system IANA tz database through `Intl`, which
// encodes each zone's full historical offset rules.

import tzlookup from "tz-lookup";

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number; // 0-59
}

const _fmt: Record<string, Intl.DateTimeFormat> = {};
function formatter(zone: string): Intl.DateTimeFormat {
  return (_fmt[zone] ||= new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longOffset",
  }));
}

// Offset (in minutes, east-positive) that `zone` is at the given UTC instant.
function offsetMinutesAt(zone: string, utc: Date): number {
  const part = formatter(zone)
    .formatToParts(utc)
    .find((p) => p.type === "timeZoneName");
  const v = part?.value ?? "GMT"; // "GMT+05:30" | "GMT" | "GMT-4" | "GMT-04:00"
  const m = v.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0; // bare "GMT" → 0
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2]);
  const mm = Number(m[3] ?? 0);
  return sign * (hh * 60 + mm);
}

// Resolve local wall-clock parts in `zone` to the true UTC offset (hours, may be
// fractional). Two-step correction handles the case where the naive guess lands
// on the wrong side of a DST transition. For non-existent (spring-forward) or
// ambiguous (fall-back) local times it returns a sane, non-throwing result.
export function offsetAtHours(zone: string, p: LocalParts): number {
  const naive = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const o1 = offsetMinutesAt(zone, new Date(naive));
  let utc = naive - o1 * 60000;
  const o2 = offsetMinutesAt(zone, new Date(utc));
  if (o2 !== o1) utc = naive - o2 * 60000;
  return offsetMinutesAt(zone, new Date(utc)) / 60;
}

// Fallback path only: Nominatim returns lat/lng but no zone. tz-lookup maps a
// coordinate to its IANA zone (never throws, always returns a string).
export function zoneFromLatLng(lat: number, lng: number): string {
  return tzlookup(lat, lng);
}
