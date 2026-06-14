import { describe, it, expect } from "vitest";
import { offsetAtHours, zoneFromLatLng } from "./timezone";

const at = (zone: string, y: number, mo: number, d: number, h = 8, mi = 40) =>
  offsetAtHours(zone, { year: y, month: mo, day: d, hour: h, minute: mi });

describe("offsetAtHours — DST & historical correctness", () => {
  it("Melbourne winter (no DST) = +10", () => {
    expect(at("Australia/Melbourne", 1998, 6, 13)).toBe(10);
  });
  it("Melbourne summer (southern-hemisphere DST) = +11", () => {
    expect(at("Australia/Melbourne", 1998, 1, 15)).toBe(11);
  });
  it("China observed DST 1986–1991: 1988 summer = +9", () => {
    expect(at("Asia/Shanghai", 1988, 7, 1)).toBe(9);
  });
  it("China after DST repeal: 1998 summer = +8", () => {
    expect(at("Asia/Shanghai", 1998, 7, 1)).toBe(8);
  });
  it("New York summer (EDT) = -4", () => {
    expect(at("America/New_York", 1998, 7, 1)).toBe(-4);
  });
  it("New York winter (EST) = -5", () => {
    expect(at("America/New_York", 1998, 1, 1)).toBe(-5);
  });
});

describe("offsetAtHours — fractional zones", () => {
  it("India = +5.5", () => {
    expect(at("Asia/Kolkata", 1998, 6, 13)).toBe(5.5);
  });
  it("Nepal = +5.75", () => {
    expect(at("Asia/Kathmandu", 1998, 6, 13)).toBe(5.75);
  });
});

describe("offsetAtHours — DST boundary robustness", () => {
  it("spring-forward non-existent local time does not throw, returns a number", () => {
    // 2021-03-14 02:30 does not exist in New York (clocks jump 02:00→03:00)
    const r = at("America/New_York", 2021, 3, 14, 2, 30);
    expect(typeof r).toBe("number");
    expect(Number.isFinite(r)).toBe(true);
  });
  it("fall-back ambiguous local time resolves to one offset", () => {
    const r = at("America/New_York", 2021, 11, 7, 1, 30);
    expect([-4, -5]).toContain(r);
  });
});

describe("zoneFromLatLng (fallback path)", () => {
  it("maps coordinates to IANA zone", () => {
    expect(zoneFromLatLng(-37.8136, 144.9631)).toBe("Australia/Melbourne");
    expect(zoneFromLatLng(31.2304, 121.4737)).toBe("Asia/Shanghai");
  });
});
