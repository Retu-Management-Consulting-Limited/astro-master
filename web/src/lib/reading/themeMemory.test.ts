import { describe, it, expect } from "vitest";
import { memoryPreface, honestGate } from "./themeMemory";

describe("theme memory preface (#2 回喂)", () => {
  it("acknowledges a recent low-mood streak", () => {
    expect(memoryPreface({ trend: "flat", lowStreak: 2 })).toMatch(/往下沉/);
  });
  it("acknowledges an upswing", () => {
    expect(memoryPreface({ trend: "up", lowStreak: 0 })).toMatch(/缓过来/);
  });
  it("returns null when there is no signal — never fabricates a memory", () => {
    expect(memoryPreface({ trend: "flat", lowStreak: 0 })).toBeNull();
  });
  it("STRONG: a low streak and an upswing read differently", () => {
    expect(memoryPreface({ trend: "flat", lowStreak: 3 })).not.toBe(memoryPreface({ trend: "up", lowStreak: 0 }));
  });
});

describe("theme deep gate (#2 — honest, not paywall · R18④)", () => {
  it("is framed as epistemic honesty, not unlocking/payment", () => {
    const g = honestGate(40);
    expect(g.headline + g.sub + g.note).not.toMatch(/解锁|付费|￥|¥|VIP|会员/);
    expect(g.sub).toMatch(/懂你 40%/); // tied to the live, honest meter
  });
  it("speaks differently once she actually knows you well", () => {
    expect(honestGate(80).sub).not.toBe(honestGate(40).sub);
    expect(honestGate(80).sub).toMatch(/懂你 80%/);
  });
});
