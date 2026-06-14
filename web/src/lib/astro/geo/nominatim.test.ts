import { describe, it, expect, vi, afterEach } from "vitest";
import { query } from "./nominatim";

function mockFetch(impl: (url: string, init?: RequestInit) => Partial<Response> | Promise<Partial<Response>>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy as unknown as typeof fetch);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("nominatim.query", () => {
  it("builds the request with city, country and a descriptive User-Agent", async () => {
    const spy = mockFetch(() => ({ ok: true, json: async () => [{ lat: "1.0", lon: "2.0" }] }));
    await query("Smalltown", "Australia");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("city=Smalltown");
    expect(url).toContain("country=Australia");
    expect((init as RequestInit).headers).toMatchObject({ "User-Agent": expect.stringContaining("Molly") });
  });

  it("parses the first result into {lat,lng}", async () => {
    mockFetch(() => ({ ok: true, json: async () => [{ lat: "-37.81", lon: "144.96" }] }));
    expect(await query("Melbourne")).toEqual({ lat: -37.81, lng: 144.96 });
  });

  it("empty results → null", async () => {
    mockFetch(() => ({ ok: true, json: async () => [] }));
    expect(await query("zzznope")).toBeNull();
  });

  it("non-ok response → null", async () => {
    mockFetch(() => ({ ok: false, json: async () => [] }));
    expect(await query("anything")).toBeNull();
  });

  it("network throw → null (never crashes the route)", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    expect(await query("anything")).toBeNull();
  });

  it("malformed coords → null", async () => {
    mockFetch(() => ({ ok: true, json: async () => [{ lat: "abc", lon: "def" }] }));
    expect(await query("anything")).toBeNull();
  });
});
