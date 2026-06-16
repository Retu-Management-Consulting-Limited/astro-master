import * as Astronomy from "astronomy-engine";

// ---- Types ----
export type BodyName =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface Placement {
  body: BodyName;
  lon: number;        // ecliptic longitude 0..360
  sign: string;       // zh sign name
  signIndex: number;  // 0..11
  degInSign: number;  // 0..30
  house: number;      // 1..12 (whole sign)
}

export interface Aspect {
  a: BodyName | "ASC" | "MC";
  b: BodyName | "ASC" | "MC";
  type: AspectType;
  angle: number;
  orb: number;        // how exact (0 = exact)
}

export interface Chart {
  placements: Placement[];
  asc: number;        // ascendant ecliptic longitude
  mc: number;
  ascSign: string;
  ascSignIndex: number;
  aspects: Aspect[];
}

export interface BirthInput {
  year: number; month: number; day: number; // calendar
  hour: number; minute: number;             // local clock time
  lat: number; lng: number; tz: number;     // tz = UTC offset hours
}

// ---- Constants ----
const SIGNS_ZH = [
  "白羊", "金牛", "双子", "巨蟹", "狮子", "处女",
  "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼",
];
const BODIES: BodyName[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];
const OBLIQUITY_DEG = 23.4393;
const ASPECTS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "sextile", angle: 60, orb: 6 },
  { type: "square", angle: 90, orb: 7 },
  { type: "trine", angle: 120, orb: 7 },
  { type: "opposition", angle: 180, orb: 8 },
];

const DEG = Math.PI / 180;
const norm360 = (d: number) => ((d % 360) + 360) % 360;

function signOf(lon: number) {
  const idx = Math.floor(norm360(lon) / 30) % 12;
  return { sign: SIGNS_ZH[idx], signIndex: idx, degInSign: norm360(lon) - idx * 30 };
}

function utcDate(b: BirthInput): Date {
  // local clock - tz = UTC. Apply the offset in the MINUTE field (as integer
  // minutes), not the hour field: Date.UTC truncates a fractional hour toward
  // zero, so `hour - 5.5` would silently drop 30 min for +5:30/+5:45 zones.
  return new Date(Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute - Math.round(b.tz * 60)));
}

function eclipticLongitude(body: BodyName, date: Date): number {
  const vec = Astronomy.GeoVector(Astronomy.Body[body], date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return norm360(ecl.elon);
}

function ascMc(date: Date, lat: number, lng: number): { asc: number; mc: number } {
  const gstHours = Astronomy.SiderealTime(date); // apparent GST in sidereal hours
  const ramc = norm360(gstHours * 15 + lng) * DEG; // local sidereal time in radians
  const e = OBLIQUITY_DEG * DEG;
  const phi = lat * DEG;

  const mc = norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(e)) / DEG);
  let asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e))
  ) / DEG;
  asc = norm360(asc);
  // The ascendant is the EASTERN horizon point: it must lead the MC by 0–180° in
  // zodiacal order (ASC is the rising degree, MC already culminated). The base
  // atan2 lands on the opposite (descendant) solution, so flip when ASC is NOT
  // ahead of MC. (Verified by chart.accuracy.test.ts: Sun sits on the ASC at
  // sunrise — without this correction the ascendant came out 180° wrong.)
  if (norm360(asc - mc) >= 180) asc = norm360(asc + 180);
  return { asc, mc };
}

export function computeChart(b: BirthInput): Chart {
  const date = utcDate(b);
  const { asc, mc } = ascMc(date, b.lat, b.lng);
  const ascS = signOf(asc);

  const placements: Placement[] = BODIES.map((body) => {
    const lon = eclipticLongitude(body, date);
    const s = signOf(lon);
    const house = ((s.signIndex - ascS.signIndex + 12) % 12) + 1; // whole-sign
    return { body, lon, sign: s.sign, signIndex: s.signIndex, degInSign: s.degInSign, house };
  });

  // aspects among bodies + ASC/MC
  const points: { name: BodyName | "ASC" | "MC"; lon: number }[] = [
    ...placements.map((p) => ({ name: p.body, lon: p.lon })),
    { name: "ASC" as const, lon: asc },
    { name: "MC" as const, lon: mc },
  ];
  const luminous = new Set(["Sun", "Moon", "ASC", "MC"]);
  const aspects: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const sep0 = Math.abs(points[i].lon - points[j].lon);
      const sep = Math.min(sep0, 360 - sep0);
      for (const asp of ASPECTS) {
        const bonus = luminous.has(points[i].name) || luminous.has(points[j].name) ? 1.5 : 0;
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb + bonus) {
          aspects.push({ a: points[i].name, b: points[j].name, type: asp.type, angle: asp.angle, orb: +orb.toFixed(2) });
          break;
        }
      }
    }
  }

  return {
    placements,
    asc,
    mc,
    ascSign: ascS.sign,
    ascSignIndex: ascS.signIndex,
    aspects,
  };
}

// transit longitude of a body at an arbitrary date (for daily/财运/行运 engines)
export function bodyLongitude(body: BodyName, date: Date): number {
  return eclipticLongitude(body, date);
}

// Recompute the four angles (here ASC + MC) for a given birth date at an
// ARBITRARY clock hour/minute at the same place. The natal angles are the only
// part of the chart that move fast with birth time (~1°/4min on the MC), so
// rectification — inferring the true birth time from life events that hit the
// angles — needs to sweep candidate hours and recompute ASC/MC for each. The
// planets barely move within a day, so we don't recompute them here. Thin
// wrapper over the (unexported) ascMc; keeps rectify.ts out of the ephemeris.
export function anglesAt(b: BirthInput, hour: number, minute: number): { asc: number; mc: number } {
  return ascMc(utcDate({ ...b, hour, minute }), b.lat, b.lng);
}

// Apparent (geocentric) retrograde: ecliptic longitude decreasing across a ±12h
// window centered on the date. The engine exposes no retrograde flag, so we
// derive it from motion. The Sun and Moon never retrograde geocentrically.
export function isRetrograde(body: BodyName, date: Date): boolean {
  if (body === "Sun" || body === "Moon") return false;
  const dt = 12 * 60 * 60 * 1000;
  let d = eclipticLongitude(body, new Date(date.getTime() + dt)) -
          eclipticLongitude(body, new Date(date.getTime() - dt));
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

export { SIGNS_ZH, BODIES };
