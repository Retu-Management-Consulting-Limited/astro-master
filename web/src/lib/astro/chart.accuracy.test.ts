import { describe, it, expect } from "vitest";
import * as Astronomy from "astronomy-engine";
import { computeChart } from "./chart";

// Independent ground-truth checks for the angles (ASC/MC), which use a custom
// formula rather than astronomy-engine's ephemeris. Physical invariants:
//   • at sunrise the Sun sits on the ASCENDANT   → chart.asc ≈ Sun longitude
//   • at sunset  the Sun sits on the DESCENDANT  → chart.asc ≈ Sun longitude + 180
//   • at solar noon the Sun sits on the MC       → chart.mc  ≈ Sun longitude
// A quadrant-flip bug once made the ascendant come out 180° wrong (opposite
// sign) for everyone; these pin it. Tolerance accounts for atmospheric
// refraction in the rise/set definition (Sun center ~0.83° below true horizon).

const norm = (d: number) => ((d % 360) + 360) % 360;
const angDiff = (a: number, b: number) => {
  const x = Math.abs(norm(a) - norm(b)) % 360;
  return x > 180 ? 360 - x : x;
};
const sunLon = (d: Date) => norm(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, d, true)).elon);
const chartAtUTC = (d: Date, lat: number, lng: number) =>
  computeChart({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), lat, lng, tz: 0 });

const LOCS: [string, number, number][] = [
  ["Melbourne", -37.81, 144.96],
  ["London", 51.51, -0.13],
  ["New York", 40.71, -74.01],
  ["Hong Kong", 22.32, 114.17],
];
const START = new Astronomy.AstroTime(new Date(Date.UTC(1990, 5, 15)));

describe("chart angles — physical accuracy", () => {
  for (const [name, lat, lng] of LOCS) {
    it(`${name}: ascendant ≈ Sun at sunrise`, () => {
      const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, new Astronomy.Observer(lat, lng, 0), +1, START, 2)!;
      const ch = chartAtUTC(rise.date, lat, lng);
      expect(angDiff(ch.asc, sunLon(rise.date))).toBeLessThan(5);
    });

    it(`${name}: descendant ≈ Sun at sunset`, () => {
      const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, new Astronomy.Observer(lat, lng, 0), -1, START, 2)!;
      const ch = chartAtUTC(set.date, lat, lng);
      expect(angDiff(ch.asc, sunLon(set.date) + 180)).toBeLessThan(5);
    });

    it(`${name}: MC ≈ Sun at solar noon`, () => {
      const tr = Astronomy.SearchHourAngle(Astronomy.Body.Sun, new Astronomy.Observer(lat, lng, 0), 0, START);
      const ch = chartAtUTC(tr.time.date, lat, lng);
      expect(angDiff(ch.mc, sunLon(tr.time.date))).toBeLessThan(2);
    });
  }
});
