import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "./chart";
import { synastry, type RelType } from "./synastry";

const a = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const b = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

describe("synastry multi-dim score", () => {
  const types: RelType[] = ["lover", "partner", "colleague", "friend", "family"];

  it("each type returns dims + total in 0..100", () => {
    for (const t of types) {
      const r = synastry(a, b, t);
      expect(r.type).toBe(t);
      expect(r.dims.length).toBeGreaterThan(0);
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(100);
      for (const d of r.dims) {
        expect(d.value).toBeGreaterThanOrEqual(0);
        expect(d.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("dimensions adapt per relationship type (partner has 合财, lover has 心动)", () => {
    expect(synastry(a, b, "partner").dims.some((d) => d.label.includes("合财"))).toBe(true);
    expect(synastry(a, b, "lover").dims.some((d) => d.label.includes("心动"))).toBe(true);
    expect(synastry(a, b, "lover").dims.some((d) => d.label.includes("合财"))).toBe(false);
  });

  it("is deterministic", () => {
    expect(synastry(a, b, "lover").total).toBe(synastry(a, b, "lover").total);
  });
});
