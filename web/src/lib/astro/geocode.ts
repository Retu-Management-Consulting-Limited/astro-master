// Stub geocoder: small embedded city table (lat, lng, fixed UTC offset).
// TODO(geo): replace with production geocoding + historical timezone (IANA/DST).
export type Geo = { lat: number; lng: number; tz: number; label: string };

const CITIES: Record<string, Geo> = {
  墨尔本: { lat: -37.8136, lng: 144.9631, tz: 10, label: "墨尔本, 澳大利亚" },
  melbourne: { lat: -37.8136, lng: 144.9631, tz: 10, label: "Melbourne, AU" },
  悉尼: { lat: -33.8688, lng: 151.2093, tz: 10, label: "悉尼, 澳大利亚" },
  sydney: { lat: -33.8688, lng: 151.2093, tz: 10, label: "Sydney, AU" },
  上海: { lat: 31.2304, lng: 121.4737, tz: 8, label: "上海, 中国" },
  shanghai: { lat: 31.2304, lng: 121.4737, tz: 8, label: "Shanghai, CN" },
  北京: { lat: 39.9042, lng: 116.4074, tz: 8, label: "北京, 中国" },
  beijing: { lat: 39.9042, lng: 116.4074, tz: 8, label: "Beijing, CN" },
  纽约: { lat: 40.7128, lng: -74.006, tz: -5, label: "纽约, 美国" },
  "new york": { lat: 40.7128, lng: -74.006, tz: -5, label: "New York, US" },
  伦敦: { lat: 51.5074, lng: -0.1278, tz: 0, label: "伦敦, 英国" },
  london: { lat: 51.5074, lng: -0.1278, tz: 0, label: "London, UK" },
  多伦多: { lat: 43.6532, lng: -79.3832, tz: -5, label: "多伦多, 加拿大" },
  toronto: { lat: 43.6532, lng: -79.3832, tz: -5, label: "Toronto, CA" },
};

export function geocode(city: string): Geo | null {
  const key = city.trim().toLowerCase();
  return CITIES[key] ?? CITIES[city.trim()] ?? null;
}
