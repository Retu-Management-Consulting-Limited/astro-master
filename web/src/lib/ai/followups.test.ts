import { describe, it, expect } from "vitest";
import { trustTier, fallbackFollowups, parseFollowups, buildFollowupPrompt, DIR_ORDER } from "./followups";

describe("followups · trust tier (fierceness is earned)", () => {
  it("a stranger (low understanding, turn 1) gets the warm tier", () => {
    expect(trustTier(15, 1)).toBe(0);
  });
  it("mid trust → point-break tier", () => {
    expect(trustTier(45, 2)).toBe(1);
  });
  it("high understanding + several turns → fierce tier", () => {
    expect(trustTier(80, 4)).toBe(2);
  });
  it("is monotonic in both inputs (more trust never lowers tier)", () => {
    expect(trustTier(60, 0)).toBeLessThanOrEqual(trustTier(60, 6));
    expect(trustTier(20, 3)).toBeLessThanOrEqual(trustTier(70, 3));
  });
  it("within-chat turns actually move the tier (same understanding, more turns → deeper)", () => {
    // 38 alone → tier 0; 38 + 3 turns crosses the 40 boundary → tier 1.
    // (this is the discriminating case: a tier that ignored `turns` would stay 0)
    expect(trustTier(38, 0)).toBe(0);
    expect(trustTier(38, 3)).toBe(1);
  });
});

describe("followups · fallback (always 3, one per direction, trust-graded)", () => {
  it("returns exactly the 3 directions in order", () => {
    expect(fallbackFollowups(0).map((f) => f.dir)).toEqual(DIR_ORDER);
  });
  it("STRONG: each direction's copy differs by tier (warm ≠ point ≠ fierce)", () => {
    for (const dir of DIR_ORDER) {
      const t0 = fallbackFollowups(0).find((f) => f.dir === dir)!.text;
      const t1 = fallbackFollowups(1).find((f) => f.dir === dir)!.text;
      const t2 = fallbackFollowups(2).find((f) => f.dir === dir)!.text;
      expect(t0).not.toBe(t1);
      expect(t1).not.toBe(t2);
      expect(t0).not.toBe(t2);
    }
  });
});

describe("followups · parse model output", () => {
  it("parses a clean JSON array, ordered by direction", () => {
    const r = parseFollowups('[{"dir":"act","text":"我能先做点什么？"},{"dir":"deep","text":"这是从什么时候开始的？"},{"dir":"meaning","text":"它在提醒我什么？"}]');
    expect(r.map((f) => f.dir)).toEqual(["deep", "meaning", "act"]); // re-ordered
    expect(r).toHaveLength(3);
  });
  it("tolerates ```json fences", () => {
    const r = parseFollowups('```json\n[{"dir":"deep","text":"我在怕什么？"}]\n```');
    expect(r).toEqual([{ dir: "deep", text: "我在怕什么？" }]);
  });
  it("drops dupes, blanks, bad dirs, and over-long text", () => {
    const r = parseFollowups('[{"dir":"deep","text":"短"},{"dir":"deep","text":"第一个深问"},{"dir":"x","text":"坏方向"},{"dir":"act","text":""},{"dir":"meaning","text":"' + "字".repeat(50) + '"}]');
    // "短" too short(<3? it's 1 char) dropped; dup deep keeps first valid; bad dir & blank & overlong dropped
    expect(r).toEqual([{ dir: "deep", text: "第一个深问" }]);
  });
  it("returns [] on garbage", () => {
    expect(parseFollowups("not json")).toEqual([]);
    expect(parseFollowups('{"dir":"deep"}')).toEqual([]);
    expect(parseFollowups(null)).toEqual([]);
  });
});

describe("followups · prompt", () => {
  it("encodes the 3 directions, agency rule, and trust tone", () => {
    const p = buildFollowupPrompt("上升天蝎。", "我：我很累\n你(Molly)：你撑太久了", "她", 2);
    expect(p).toMatch(/deep/);
    expect(p).toMatch(/meaning/);
    expect(p).toMatch(/act/);
    expect(p).toMatch(/能动|出路/); // ⑥ never leave them in the wound
    expect(p).toMatch(/狠/); // tier-2 tone present
    expect(p).toMatch(/JSON/);
  });
});
