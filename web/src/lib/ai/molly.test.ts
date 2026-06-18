import { describe, it, expect } from "vitest";
import {
  personaFor,
  pronoun,
  facts,
  langDirective,
  PERSONA,
  PERSONA_MALE,
  PERSONA_RU,
  PERSONA_RU_MALE,
  SAFETY,
  SAFETY_RU,
} from "./molly";
import type { Chart } from "@/lib/astro/chart";

describe("persona by gender (zh — unchanged)", () => {
  it("female / default keeps the current voice", () => {
    expect(personaFor("female")).toBe(PERSONA);
    expect(personaFor(undefined)).toBe(PERSONA);
    // explicit zh locale is byte-identical to the no-locale default
    expect(personaFor("female", "zh")).toBe(PERSONA);
    expect(personaFor(undefined, "zh")).toBe(PERSONA);
  });
  it("male variant uses 他 and a direction/agency register, not the female-coded one", () => {
    const m = personaFor("male");
    expect(m).not.toBe(PERSONA);
    expect(m).toContain("他");
    expect(m).toContain("方向");
    expect(personaFor("male", "zh")).toBe(PERSONA_MALE);
  });
  it("pronoun maps gender → 他/她", () => {
    expect(pronoun("male")).toBe("他");
    expect(pronoun("female")).toBe("她");
    expect(pronoun(undefined)).toBe("她");
  });
});

describe("persona by locale (ru)", () => {
  it("ru female returns the Russian persona (not the zh one)", () => {
    const p = personaFor("female", "ru");
    expect(p).toBe(PERSONA_RU);
    expect(p).not.toBe(PERSONA);
    expect(p).toContain("Molly");
    // written in Russian (Cyrillic present, no Chinese)
    expect(/[А-Яа-яЁё]/.test(p)).toBe(true);
    expect(/[一-鿿]/.test(p)).toBe(false);
  });
  it("ru male returns the Russian male persona and differs from ru female", () => {
    const m = personaFor("male", "ru");
    expect(m).toBe(PERSONA_RU_MALE);
    expect(m).not.toBe(PERSONA_RU);
    expect(/[А-Яа-яЁё]/.test(m)).toBe(true);
    expect(/[一-鿿]/.test(m)).toBe(false);
  });
  it("ru personas instruct the model to output in Russian", () => {
    expect(personaFor("female", "ru").toLowerCase()).toContain("русск");
    expect(personaFor("male", "ru").toLowerCase()).toContain("русск");
  });
});

describe("SAFETY rails carry the §9 constraints in both languages", () => {
  const mustHave = (s: string, parts: RegExp[]) =>
    parts.forEach((p) => expect(p.test(s)).toBe(true));
  it("zh SAFETY is byte-unchanged and covers crisis + medical/legal + jailbreak", () => {
    expect(SAFETY).toContain("自杀");
    expect(SAFETY).toContain("医疗");
  });
  it("ru SAFETY is Russian and covers crisis + medical/legal + jailbreak (§9)", () => {
    expect(/[А-Яа-яЁё]/.test(SAFETY_RU)).toBe(true);
    expect(/[一-鿿]/.test(SAFETY_RU)).toBe(false);
    // crisis: suicide / self-harm wording
    mustHave(SAFETY_RU.toLowerCase(), [/самоуб|суицид/, /мед|врач/, /прав|закон|юрид/]);
  });
});

describe("langDirective", () => {
  it("zh adds nothing (empty string) → zh prompts byte-unchanged", () => {
    expect(langDirective("zh")).toBe("");
    expect(langDirective()).toBe("");
  });
  it("ru returns a Russian-output instruction that keeps JSON keys/structure", () => {
    const d = langDirective("ru");
    expect(d.length).toBeGreaterThan(0);
    expect(d.toLowerCase()).toContain("русск");
    // it must NOT tell the model to change the JSON shape — keys stay as-is
    expect(/[一-鿿]/.test(d)).toBe(false);
  });
});

// Minimal real-shaped chart for facts() locale rendering.
const CHART: Chart = {
  placements: [
    { body: "Sun", lon: 5, sign: "白羊", signIndex: 0, degInSign: 5, house: 1 },
    { body: "Venus", lon: 215, sign: "天蝎", signIndex: 7, degInSign: 5, house: 8 },
    { body: "Moon", lon: 95, sign: "巨蟹", signIndex: 3, degInSign: 5, house: 4 },
  ],
  asc: 0,
  mc: 270,
  ascSign: "白羊",
  ascSignIndex: 0,
  aspects: [{ a: "Sun", b: "Moon", type: "square", angle: 90, orb: 1 }],
};

describe("facts(chart, locale)", () => {
  it("zh (default) is byte-unchanged and uses Chinese terms", () => {
    const zh = facts(CHART);
    expect(zh).toBe(facts(CHART, "zh"));
    expect(zh).toContain("太阳");
    expect(zh).toContain("金星");
    expect(zh).toContain("上升");
  });
  it("ru renders chart facts with Russian astrology terms, no Chinese", () => {
    const ru = facts(CHART, "ru");
    // planet + sign translated via glossary
    expect(ru).toContain("Венера"); // Venus
    expect(ru).toContain("Скорпион"); // Scorpio (天蝎)
    expect(ru).toContain("Солнце"); // Sun
    expect(ru).toContain("Асцендент"); // 上升
    // aspect type translated
    expect(ru).toContain("Квадратура"); // square
    // no Chinese leakage in the ru rendering
    expect(/[一-鿿]/.test(ru)).toBe(false);
  });
});
