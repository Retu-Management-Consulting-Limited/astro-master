import { describe, it, expect } from "vitest";
import { parsePartners, withPartner, type SavedPartner } from "./synastryPartners";

const base: SavedPartner[] = [];
const chart = { ascSign: "双鱼", placements: [{ body: "Sun" }] };

describe("synastryPartners storage", () => {
  it("adds a partner by token", () => {
    const list = withPartner(base, { token: "t1", name: "小鱼", chart }, 1000);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ token: "t1", name: "小鱼", at: 1000 });
  });

  it("upsert merges by token, preserving prior fields and updating provided ones", () => {
    let list = withPartner(base, { token: "t1", name: "小鱼", chart }, 1000);
    // later A views the lover result → record type/total without losing name/chart
    list = withPartner(list, { token: "t1", name: "小鱼", chart, type: "lover", total: 73 }, 2000);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ token: "t1", name: "小鱼", type: "lover", total: 73, at: 2000 });
    expect(list[0].chart).toEqual(chart);
  });

  it("keeps multiple distinct partners", () => {
    let list = withPartner(base, { token: "t1", name: "小鱼", chart }, 1000);
    list = withPartner(list, { token: "t2", name: "Leo", chart }, 1100);
    expect(list.map((p) => p.token)).toEqual(["t1", "t2"]);
  });

  it("parsePartners drops malformed entries", () => {
    const raw = JSON.stringify([{ token: "ok", name: "A", chart }, { token: 1 }, null, { name: "noToken" }]);
    expect(parsePartners(raw).map((p) => p.token)).toEqual(["ok"]);
  });

  it("parsePartners tolerates garbage", () => {
    expect(parsePartners(null)).toEqual([]);
    expect(parsePartners("not json")).toEqual([]);
  });
});
