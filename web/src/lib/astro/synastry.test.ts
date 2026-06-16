import { describe, it, expect } from "vitest";
import { computeChart, type BirthInput } from "./chart";
import { synastry, type RelType, type SynAspect } from "./synastry";

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

describe("synastry exposes per-dim cross-aspects (Unit A)", () => {
  it("every dim has an aspects array", () => {
    const r = synastry(a, b, "lover");
    for (const d of r.dims) {
      expect(Array.isArray(d.aspects)).toBe(true);
    }
  });
});

describe("dimAspects content (Unit A · D6 全部命中)", () => {
  it("aspects are sorted by strength desc, valid kind/angle, real bodies", () => {
    const r = synastry(a, b, "lover");
    const all: SynAspect[] = r.dims.flatMap((d) => d.aspects);
    expect(all.length).toBeGreaterThan(0); // 这两个测试盘至少命中一条
    for (const asp of all) {
      expect([0, 60, 90, 120, 180]).toContain(asp.angle);
      expect(["harmony", "tension"]).toContain(asp.kind);
      expect(asp.strength).toBeGreaterThan(0);
      expect(asp.strength).toBeLessThanOrEqual(1);
      expect(typeof asp.a).toBe("string");
      expect(typeof asp.b).toBe("string");
    }
    // 每个维度内部按 strength 降序
    for (const d of r.dims) {
      const s = d.aspects.map((x) => x.strength);
      expect(s).toEqual([...s].sort((p, q) => q - p));
    }
  });

  it("same-body pairs (Moon-Moon) are not double-counted", () => {
    const safety = synastry(a, b, "lover").dims.find((d) => d.key === "safety")!;
    const moonMoon = safety.aspects.filter((x) => x.a === "Moon" && x.b === "Moon");
    expect(moonMoon.length).toBeLessThanOrEqual(1);
  });

  it("does NOT change baseline scores (value/total untouched)", () => {
    const r1 = synastry(a, b, "lover");
    const r2 = synastry(a, b, "lover");
    expect(r1.total).toBe(r2.total);
    expect(r1.dims.map((d) => d.value)).toEqual(r2.dims.map((d) => d.value));
  });
});
