import { describe, it, expect } from "vitest";
import { sect, essentialDignity, chartRuler, combustState, interpretiveFacts } from "./dignities";
import { computeChart } from "./chart";

// Longitudes for Kevin's verified chart (Swiss-Ephemeris ground truth), used as
// the golden case: Sun 19.55° Aqu=319.55, Venus 12° Pis=342, Mars 13° Cap=283,
// Saturn 12.95° Can=102.95, Moon 24.79° Cap=294.79, Mercury 18.26° Aqu=318.26, ASC Aqu=324.49.

describe("sect", () => {
  it("Kevin (dawn): Sun just above the ASC → diurnal", () => {
    expect(sect(319.55, 324.49)).toBe("diurnal");
  });
  it("Sun below the horizon (90° ahead of ASC, not yet risen) → nocturnal", () => {
    expect(sect(54.49, 324.49)).toBe("nocturnal");
  });
});

describe("essentialDignity", () => {
  it("Kevin golden cases", () => {
    expect(essentialDignity("Sun", 319.55)).toEqual({ status: "detriment", score: -5 });   // Aquarius
    expect(essentialDignity("Venus", 342)).toEqual({ status: "exaltation", score: 4 });     // Pisces
    expect(essentialDignity("Mars", 283)).toEqual({ status: "exaltation", score: 4 });       // Capricorn
    expect(essentialDignity("Saturn", 102.95)).toEqual({ status: "detriment", score: -5 });  // Cancer
    expect(essentialDignity("Moon", 294.79)).toEqual({ status: "detriment", score: -5 });    // Capricorn
  });
  it("domicile: Saturn in Aquarius → +5", () => {
    expect(essentialDignity("Saturn", 305)).toEqual({ status: "domicile", score: 5 });
  });
  it("fall: Sun in Libra (opposite its Aries exaltation) → -4", () => {
    expect(essentialDignity("Sun", 186)).toEqual({ status: "fall", score: -4 });
  });
  it("triplicity: Saturn in Gemini (Air) in a DAY chart → +3", () => {
    expect(essentialDignity("Saturn", 70, "diurnal")).toEqual({ status: "triplicity", score: 3 });
  });
  it("peregrine: Mars in Gemini with no dignity → -5", () => {
    expect(essentialDignity("Mars", 70, "diurnal")).toEqual({ status: "peregrine", score: -5 });
  });
  it("outer planets have no classical dignity", () => {
    expect(essentialDignity("Pluto", 200)).toEqual({ status: "none", score: 0 });
  });
});

describe("chartRuler", () => {
  it("traditional domicile ruler of the ascending sign", () => {
    expect(chartRuler(10)).toBe("Saturn"); // Aquarius (Kevin)
    expect(chartRuler(4)).toBe("Sun");      // Leo
    expect(chartRuler(7)).toBe("Mars");     // Scorpio
    expect(chartRuler(11)).toBe("Jupiter"); // Pisces
  });
});

describe("combustState", () => {
  it("Kevin: Mercury 1.29° from Sun → combust", () => {
    expect(combustState(318.26, 319.55)).toBe("combust");
  });
  it("within 17' → cazimi", () => {
    expect(combustState(319.5, 319.55)).toBe("cazimi");
  });
  it("8.5°–17° → under-beams", () => {
    expect(combustState(309, 319.55)).toBe("under-beams");
  });
  it("far from Sun → free", () => {
    expect(combustState(100, 319.55)).toBe("free");
  });
});

describe("interpretiveFacts (Kevin end-to-end)", () => {
  // Kevin: 1975-02-09 07:00 CST, 吉林 (43.85N, 126.55E)
  const chart = computeChart({ year: 1975, month: 2, day: 9, hour: 7, minute: 0, lat: 43.85, lng: 126.55, tz: 8 });
  const f = interpretiveFacts(chart);
  it("derives sect, chart ruler, and Kevin's signature dignities", () => {
    expect(f.sect).toBe("diurnal");
    expect(f.chartRuler.body).toBe("Saturn");
    expect(f.chartRuler.dignity.status).toBe("detriment"); // Saturn in Cancer
    const sun = f.planets.find((p) => p.body === "Sun")!;
    const venus = f.planets.find((p) => p.body === "Venus")!;
    const mars = f.planets.find((p) => p.body === "Mars")!;
    expect(sun.dignity.status).toBe("detriment");
    expect(venus.dignity.status).toBe("exaltation");
    expect(mars.dignity.status).toBe("exaltation");
    expect(f.planets.find((p) => p.body === "Mercury")!.combust).toBe("combust");
  });
  it("renders a compact, bounded Chinese fact string", () => {
    const s = f.text;
    expect(s).toContain("日生盘");
    expect(s).toContain("命主星");
    expect(s).toContain("土星");
    expect(typeof s).toBe("string");
    expect(s.length).toBeLessThan(400);
  });
});
