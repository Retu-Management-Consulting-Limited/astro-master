import { describe, it, expect } from "vitest";
import { wrapQuote, buildCardSVG } from "./card";

describe("wrapQuote", () => {
  it("wraps a long CJK quote into ≤4 lines", () => {
    const lines = wrapQuote("你最大的本事是让所有人都以为你不需要任何人陪伴在身边长久");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.join("")).toContain("你最大的本事");
  });

  it("keeps short quotes on one line", () => {
    expect(wrapQuote("你不需要任何人")).toHaveLength(1);
  });

  it("never drops characters", () => {
    const q = "孤独是你的底色也是你的盔甲很久了";
    expect(wrapQuote(q).join("")).toBe(q);
  });
});

describe("buildCardSVG", () => {
  const data = { dedication: "致 · 漂在墨尔本的你", quote: "你不需要任何人", signs: "☉ 双子 ☽ 双鱼 ↑ 天蝎" };

  it("produces a valid svg containing the quote and signs", () => {
    const svg = buildCardSVG(data, "a");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("你不需要任何人");
    expect(svg).toContain("双子");
    expect(svg).toContain("Molly");
  });

  it("export path uses no external font URL (avoids canvas taint)", () => {
    const svg = buildCardSVG(data, "a", { forExport: true });
    expect(svg).not.toContain("Cormorant");
    expect(svg).not.toContain("googleapis"); // no external font fetch
    expect(svg).not.toContain("@font-face");
  });

  it("escapes angle brackets in user-derived text", () => {
    const svg = buildCardSVG({ ...data, quote: "a<b>c" }, "a");
    expect(svg).toContain("a&lt;b&gt;c");
  });

  it("each template renders", () => {
    for (const t of ["a", "b", "c", "d"] as const) {
      expect(buildCardSVG(data, t).startsWith("<svg")).toBe(true);
    }
  });
});
