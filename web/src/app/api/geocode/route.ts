import { NextResponse } from "next/server";
import { lookup } from "@/lib/astro/geo/citydb";
import { query as nominatimQuery } from "@/lib/astro/geo/nominatim";
import { offsetAtHours, zoneFromLatLng } from "@/lib/astro/geo/timezone";
import { geoCacheGet, geoCacheSet } from "@/lib/server/store";

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
  if (!date) return NextResponse.json({ error: "missing date" }, { status: 400 });
  const local = parseLocal(date, time ?? undefined);
  if (!local.year || !local.month || !local.day) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }

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
