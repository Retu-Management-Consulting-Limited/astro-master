import { describe, it, expect } from "vitest";
import { lookup } from "./citydb";

describe("citydb.lookup — bilingual matching", () => {
  it("matches Chinese name", () => {
    const r = lookup("墨尔本")!;
    expect(r.iana).toBe("Australia/Melbourne");
    expect(r.lat).toBeCloseTo(-37.81, 1);
    expect(r.label).toContain("澳大利亚");
  });
  it("matches English name, case-insensitive", () => {
    expect(lookup("melbourne")!.iana).toBe("Australia/Melbourne");
    expect(lookup("MELBOURNE")!.iana).toBe("Australia/Melbourne");
    expect(lookup("  Melbourne ")!.iana).toBe("Australia/Melbourne");
  });
  it("matches 上海 → Asia/Shanghai", () => {
    expect(lookup("上海")!.iana).toBe("Asia/Shanghai");
    expect(lookup("shanghai")!.iana).toBe("Asia/Shanghai");
  });
});

describe("citydb.lookup — country disambiguation", () => {
  it("no country → global highest population (London → UK)", () => {
    expect(lookup("london")!.iana).toBe("Europe/London");
  });
  it("country narrows to the right one (London + Canada → Toronto tz)", () => {
    expect(lookup("london", "Canada")!.iana).toBe("America/Toronto");
    expect(lookup("london", "加拿大")!.iana).toBe("America/Toronto");
    expect(lookup("london", "CA")!.iana).toBe("America/Toronto");
  });
  it("country variants all resolve (墨尔本 + 澳大利亚/Australia/AU)", () => {
    for (const c of ["澳大利亚", "Australia", "australia", "AU", "au"]) {
      expect(lookup("墨尔本", c)!.iana).toBe("Australia/Melbourne");
    }
  });
  it("unrecognized country falls back to global max, never blocks", () => {
    expect(lookup("london", "Narnia")!.iana).toBe("Europe/London");
  });
});

describe("citydb.lookup — misses", () => {
  it("unknown city → null", () => {
    expect(lookup("zzxqnonsense")).toBeNull();
    expect(lookup("")).toBeNull();
  });
});
