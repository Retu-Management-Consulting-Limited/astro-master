// Fallback geocoder: OpenStreetMap Nominatim. Only hit when the offline city DB
// misses; the route caches results in KV so real call volume stays tiny.
//
// OSM usage policy: send a descriptive User-Agent and keep volume low. For
// production scale-up, self-host or switch to Mapbox (tracked in the spec).

export interface LatLng {
  lat: number;
  lng: number;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Molly-astro/1.0 (+https://web-beige-psi-kre97cof9a.vercel.app)";

export async function query(city: string, country?: string): Promise<LatLng | null> {
  const params = new URLSearchParams({ format: "jsonv2", limit: "1", city });
  if (country) params.set("country", country);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const lat = Number(arr[0].lat);
    const lng = Number(arr[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
