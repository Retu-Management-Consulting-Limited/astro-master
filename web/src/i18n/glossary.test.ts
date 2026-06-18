import { describe, it, expect } from "vitest";
import {
  PLANETS,
  SIGNS,
  HOUSES,
  ASPECTS,
  TERMS,
  GLOSSARY_SIZE,
} from "./glossary";

// 术语表契约：每个并行任务的 ru 译文引用这里保持一致。守护它结构完整、
// 不被某次编辑悄悄改残（少一边语言 = 译文漂移）。

const SECTIONS = { PLANETS, SIGNS, HOUSES, ASPECTS, TERMS };

describe("glossary", () => {
  it("exports the five sections the plan requires", () => {
    expect(PLANETS).toBeTruthy();
    expect(SIGNS).toBeTruthy();
    expect(HOUSES).toBeTruthy();
    expect(ASPECTS).toBeTruthy();
    expect(TERMS).toBeTruthy();
  });

  for (const [name, section] of Object.entries(SECTIONS)) {
    it(`every ${name} entry has non-empty zh AND ru`, () => {
      for (const [key, { zh, ru }] of Object.entries(section)) {
        expect(zh, `${name}.${key}.zh`).toBeTruthy();
        expect(ru, `${name}.${key}.ru`).toBeTruthy();
      }
    });
  }

  it("covers the 10 planets + 12 signs + 12 houses + 5 core aspects", () => {
    // 必备占星基础集合不能漏。
    expect(Object.keys(SIGNS)).toHaveLength(12);
    expect(Object.keys(HOUSES)).toHaveLength(12);
    for (const p of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]) {
      expect(PLANETS[p], `planet ${p}`).toBeTruthy();
    }
    for (const a of ["conjunction", "sextile", "square", "trine", "opposition"]) {
      expect(ASPECTS[a], `aspect ${a}`).toBeTruthy();
    }
  });

  it("has roughly the planned ~90 terms (the shared scout list)", () => {
    expect(GLOSSARY_SIZE).toBeGreaterThanOrEqual(90);
  });

  it("SIGNS zh order matches chart.ts SIGNS_ZH (白羊 起)", () => {
    const order = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
    expect(Object.values(SIGNS).map((s) => s.zh)).toEqual(order);
  });
});
