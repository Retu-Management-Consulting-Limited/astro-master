import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock only the network boundary; citydb/timezone/KV(memory) run for real.
vi.mock("@/lib/astro/geo/nominatim", () => ({ query: vi.fn() }));
import { query as nominatimQuery } from "@/lib/astro/geo/nominatim";
import { GET } from "./route";

const call = (qs: string) => GET(new Request(`http://x/api/geocode?${qs}`));
const enc = encodeURIComponent;

describe("GET /api/geocode", () => {
  beforeEach(() => vi.mocked(nominatimQuery).mockReset());

  it("offline hit 墨尔本 1998-06-13 → tz +10, no network call", async () => {
    const res = await call(`city=${enc("墨尔本")}&country=${enc("澳大利亚")}&date=1998-06-13&time=08:40`);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.tz).toBe(10);
    expect(j.iana).toBe("Australia/Melbourne");
    expect(j.label).toContain("澳大利亚");
    expect(nominatimQuery).not.toHaveBeenCalled();
  });

  it("DST aware: Melbourne summer 1998-01-15 → tz +11", async () => {
    expect((await (await call("city=Melbourne&date=1998-01-15")).json()).tz).toBe(11);
  });

  it("historical China DST: 上海 1988-07-01 → tz +9", async () => {
    expect((await (await call(`city=${enc("上海")}&date=1988-07-01`)).json()).tz).toBe(9);
  });

  it("fractional zone: Mumbai → tz 5.5", async () => {
    expect((await (await call("city=Mumbai&date=1998-06-13&time=08:40")).json()).tz).toBe(5.5);
  });

  it("missing time defaults to noon (still resolves)", async () => {
    expect((await call("city=Melbourne&date=1998-06-13")).status).toBe(200);
  });

  it("falls back to Nominatim on offline miss, then caches (no 2nd network call)", async () => {
    vi.mocked(nominatimQuery).mockResolvedValue({ lat: 48.0, lng: 7.85 }); // SW Germany
    const r1 = await call("city=zzobscuretown&country=Germany&date=1998-06-13");
    expect(r1.status).toBe(200);
    expect((await r1.json()).iana).toBe("Europe/Berlin");
    expect(nominatimQuery).toHaveBeenCalledOnce();

    const r2 = await call("city=zzobscuretown&country=Germany&date=1998-06-13");
    expect((await r2.json()).iana).toBe("Europe/Berlin");
    expect(nominatimQuery).toHaveBeenCalledOnce(); // served from KV cache
  });

  it("404 when nothing resolves — never fabricates coordinates", async () => {
    vi.mocked(nominatimQuery).mockResolvedValue(null);
    expect((await call("city=zzznoplaceatall&date=1998-06-13")).status).toBe(404);
  });

  it("400 on missing city or date", async () => {
    expect((await call("date=1998-06-13")).status).toBe(400);
    expect((await call("city=Melbourne")).status).toBe(400);
  });
});
