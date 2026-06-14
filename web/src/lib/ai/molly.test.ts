import { describe, it, expect } from "vitest";
import { personaFor, pronoun, PERSONA } from "./molly";

describe("persona by gender", () => {
  it("female / default keeps the current voice", () => {
    expect(personaFor("female")).toBe(PERSONA);
    expect(personaFor(undefined)).toBe(PERSONA);
  });
  it("male variant uses 他 and a direction/agency register, not the female-coded one", () => {
    const m = personaFor("male");
    expect(m).not.toBe(PERSONA);
    expect(m).toContain("他");
    expect(m).toContain("方向");
  });
  it("pronoun maps gender → 他/她", () => {
    expect(pronoun("male")).toBe("他");
    expect(pronoun("female")).toBe("她");
    expect(pronoun(undefined)).toBe("她");
  });
});
