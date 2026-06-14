import { describe, it, expect } from "vitest";
import { parseTokens, withToken } from "./synastryTokens";

describe("synastry token list", () => {
  it("parses missing/garbage as empty", () => {
    expect(parseTokens(null)).toEqual([]);
    expect(parseTokens("not json")).toEqual([]);
    expect(parseTokens('{"a":1}')).toEqual([]);
    expect(parseTokens("[1,2,\"x\"]")).toEqual(["x"]);
  });

  it("appends without losing prior tokens (B1: no silent overwrite)", () => {
    let list = withToken([], "a");
    list = withToken(list, "b");
    expect(list).toEqual(["a", "b"]);
  });

  it("de-dupes and moves an existing token to newest", () => {
    expect(withToken(["a", "b"], "a")).toEqual(["b", "a"]);
  });

  it("caps at the 6 most recent", () => {
    let list: string[] = [];
    for (const t of ["1", "2", "3", "4", "5", "6", "7", "8"]) list = withToken(list, t);
    expect(list).toEqual(["3", "4", "5", "6", "7", "8"]);
    expect(list.length).toBe(6);
  });
});
