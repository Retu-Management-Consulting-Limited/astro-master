// Offline city lookup over the GeoNames-derived bilingual index.
// Pure data + matching logic — no I/O, no network. The index JSON is built by
// scripts/build-cities.ts and imported so the bundler ships it to serverless.

import raw from "./cities.index.json";

// row = [lat, lng, iana, countryCode, population, displayZh, displayEn]
type Row = [number, number, string, string, number, string, string];
interface CityIndex {
  rows: Row[];
  index: Record<string, number[]>; // normalized name → row indices (pop desc)
  countries: Record<string, [string, string]>; // ISO2 → [zh, en]
}
const data = raw as unknown as CityIndex;

export interface GeoResult {
  lat: number;
  lng: number;
  iana: string;
  label: string;
}

const hasCJK = (s: string) => /[㐀-鿿]/.test(s);
const norm = (s: string) => (hasCJK(s) ? s.trim() : s.trim().toLowerCase());

// Free-text country ("澳大利亚" / "Australia" / "AU") → ISO alpha-2.
const countryToIso = new Map<string, string>();
for (const [iso, [zh, en]] of Object.entries(data.countries)) {
  countryToIso.set(iso.toLowerCase(), iso);
  countryToIso.set(zh.trim(), iso);
  countryToIso.set(en.trim().toLowerCase(), iso);
}
function resolveCountry(c?: string): string | null {
  if (!c) return null;
  const t = c.trim();
  return countryToIso.get(t) ?? countryToIso.get(t.toLowerCase()) ?? null;
}

/**
 * Look up a city by name, optionally narrowed by country.
 * - Posting lists are pre-sorted by population (desc).
 * - With a resolvable country, return the highest-population match in it.
 * - Otherwise (no country, or unrecognized) return the global highest-population
 *   match so the funnel never blocks; the returned `label` lets the user verify.
 * Returns null only when the name is unknown.
 */
export function lookup(city: string, country?: string): GeoResult | null {
  const ids = data.index[norm(city)];
  if (!ids || ids.length === 0) return null;

  const iso = resolveCountry(country);
  let pick: number | undefined;
  if (iso) pick = ids.find((i) => data.rows[i][3] === iso);
  pick ??= ids[0];

  const r = data.rows[pick];
  const cityName = r[5] || r[6];
  const countryName = data.countries[r[3]]?.[0] ?? r[3];
  return { lat: r[0], lng: r[1], iana: r[2], label: `${cityName}, ${countryName}` };
}
