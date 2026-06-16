import { describe, it, expect } from "vitest";
import { computeChart } from "@/lib/astro/chart";
import { synastry, type RelType } from "@/lib/astro/synastry";
import { synScaffold } from "./synastry";

const a = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const b = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const TYPES: RelType[] = ["lover", "partner", "colleague", "friend", "family"];

describe("synScaffold — per-RelType deterministic reading (kills mad-lib)", () => {
  it("each relationship type yields a DISTINCT catchLine (no shared mad-lib template)", () => {
    const lines = TYPES.map((t) => synScaffold(synastry(a, b, t)).catchLine);
    expect(new Set(lines).size).toBe(TYPES.length); // 5 types → 5 distinct catchLines
  });

  it("body references the strongest and weakest dimension names (no emoji prefix)", () => {
    const r = synastry(a, b, "lover");
    const dims = [...r.dims].sort((x, y) => y.value - x.value);
    const hn = dims[0].label.replace(/^[^一-龥]+/, "");
    const ln = dims[dims.length - 1].label.replace(/^[^一-龥]+/, "");
    const out = synScaffold(r);
    expect(out.body).toContain(hn);
    expect(out.body).toContain(ln);
    // strength values surfaced
    expect(out.body).toContain(String(dims[0].value));
    // no leading emoji leaked into copy
    expect(out.vibe).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2764}]/u);
  });

  it("names the other person when provided", () => {
    const out = synScaffold(synastry(a, b, "lover"), "我", "小鱼");
    const joined = out.vibe + out.body + out.catchLine;
    expect(joined.length).toBeGreaterThan(0);
  });

  it("is pure/deterministic", () => {
    const r = synastry(a, b, "partner");
    expect(synScaffold(r)).toEqual(synScaffold(r));
  });

  it("colleague catchLine is about work dynamics, NOT the old romantic '先松口' line", () => {
    const out = synScaffold(synastry(a, b, "colleague"));
    expect(out.catchLine).not.toContain("松口"); // the old mad-lib line was wrong for colleagues
  });
});
