import { NextResponse } from "next/server";
import { lookup } from "@/lib/astro/geo/citydb";
import { query as nominatimQuery } from "@/lib/astro/geo/nominatim";
import { offsetAtHours, zoneFromLatLng } from "@/lib/astro/geo/timezone";
import { geoCacheGet, geoCacheSet } from "@/lib/server/store";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { validBirthDateTime } from "@/lib/astro/birthdate";

export const runtime = "nodejs";

// GET /api/geocode?city=&country=&date=YYYY-MM-DD&time=HH:mm
// Resolves a birthplace to { lat, lng, iana, tz, label } where `tz` is the UTC
// offset (hours, may be fractional) AT the birth instant — DST/historical aware.
//
// Resolution order: offline city DB → KV cache → Nominatim. If none yields
// trustworthy coordinates we return 404 rather than fabricate a (wrong) chart.

interface Resolved {
  lat: number;
  lng: number;
  iana: string;
  label: string;
}

function parseLocal(date: string, time?: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time && /^\d{1,2}:\d{2}$/.test(time) ? time : "12:00").split(":").map(Number);
  return { year: y, month: mo, day: d, hour: h, minute: mi };
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const city = (u.searchParams.get("city") ?? "").trim();
  const country = (u.searchParams.get("country") ?? "").trim() || undefined;
  const date = (u.searchParams.get("date") ?? "").trim();
  const time = u.searchParams.get("time") ?? undefined;

  if (!city) return NextResponse.json({ error: "missing city" }, { status: 400 });
  if (city.length > 80) return NextResponse.json({ error: "city too long" }, { status: 400 }); // N1: bound external lookups
  if (!date) return NextResponse.json({ error: "missing date" }, { status: 400 });
  // N2: validate ranges (month/day/time) + reject future / pre-1900 (M6/L1).
  if (!validBirthDateTime(date, time ?? undefined)) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }
  const local = parseLocal(date, time ?? undefined);

  // N1: rate-limit per identity — each offline miss can hit external Nominatim.
  const rl = await rateLimit(await resolveIdentity(req), RULES.geocode());
  if (!rl.ok) return NextResponse.json({ error: "查询太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

  let r: Resolved | null = lookup(city, country);

  if (!r) {
    const ckey = `${(country ?? "").toLowerCase()}|${city.toLowerCase()}`;
    r = (await geoCacheGet(ckey).catch(() => null)) as Resolved | null;

    if (!r) {
      const nm = await nominatimQuery(city, country);
      if (!nm) return NextResponse.json({ error: "city not found" }, { status: 404 });
      r = {
        lat: nm.lat,
        lng: nm.lng,
        iana: zoneFromLatLng(nm.lat, nm.lng),
        label: country ? `${city}, ${country}` : city,
      };
      await geoCacheSet(ckey, r).catch(() => {});
    }
  }

  const tz = offsetAtHours(r.iana, local);
  return NextResponse.json({ lat: r.lat, lng: r.lng, tz, label: r.label, iana: r.iana });
}
