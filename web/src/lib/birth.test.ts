import { describe, it, expect, vi, afterEach } from "vitest";
import { buildBirth, birthSummary, resolveBirth } from "./birth";
import type { BirthForm } from "./store";

const form: BirthForm = { date: "1998-06-13", time: "08:40", knownTime: false, country: "澳大利亚", city: "墨尔本" };

describe("buildBirth", () => {
  it("maps form + geo into a BirthInput (carries fractional tz verbatim)", () => {
    const b = buildBirth(form, { lat: -37.81, lng: 144.96, tz: 10 });
    expect(b).toMatchObject({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.81, lng: 144.96, tz: 10 });
  });
  it("unknown time anchors at noon", () => {
    const b = buildBirth({ ...form, knownTime: true }, { lat: 0, lng: 0, tz: 0 });
    expect(b.hour).toBe(12);
    expect(b.minute).toBe(0);
  });
});

describe("birthSummary", () => {
  it("formats date · time · city", () => {
    expect(birthSummary(form)).toBe("1998-06-13 · 08:40 · 墨尔本");
  });
  it("shows 时间未知 when time unknown", () => {
    expect(birthSummary({ ...form, knownTime: true })).toContain("时间未知");
  });
  it("handles missing form", () => {
    expect(birthSummary(undefined)).toBe("未填写");
  });
});

describe("resolveBirth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls /api/geocode and builds the birth on the returned offset", async () => {
    const spy = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ lat: -37.81, lng: 144.96, tz: 11 }) }));
    vi.stubGlobal("fetch", spy as unknown as typeof fetch);
    const r = await resolveBirth(form);
    expect("birth" in r && r.birth.tz).toBe(11); // server-resolved DST offset, not a guess
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain("/api/geocode");
    expect(url).toContain("date=1998-06-13");
  });

  it("404 → friendly error", async () => {
    vi.stubGlobal("fetch", (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch);
    const r = await resolveBirth(form);
    expect("error" in r && r.error).toContain("墨尔本");
  });

  it("network failure → friendly error, no throw", async () => {
    vi.stubGlobal("fetch", (() => {
      throw new Error("down");
    }) as unknown as typeof fetch);
    const r = await resolveBirth(form);
    expect("error" in r).toBe(true);
  });
});
