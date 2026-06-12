import type { Chart, Placement, Aspect, BodyName } from "./chart";

export type Domain = "love" | "career" | "self" | "mind" | "shadow" | "lonely";

export interface Highlight {
  id: string;
  kind: "aspect" | "angular" | "stellium" | "luminary";
  score: number;
  bodies: (BodyName | "ASC" | "MC")[];
  summary: string; // zh, e.g. "金星天蝎·七宫"
  domain: Domain;
}

const BODY_ZH: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
  ASC: "上升", MC: "天顶",
};
const ASPECT_ZH: Record<string, string> = {
  conjunction: "合", sextile: "六分", square: "刑", trine: "拱", opposition: "冲",
};
// importance weight per body for ranking
const WEIGHT: Record<string, number> = {
  Sun: 5, Moon: 5, ASC: 5, Venus: 4, Mars: 4, MC: 4, Mercury: 3,
  Jupiter: 3, Saturn: 3, Pluto: 3, Uranus: 2, Neptune: 2,
};
const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);

function houseDomain(house: number): Domain {
  if ([5, 7, 8].includes(house)) return "love";
  if ([2, 6, 10].includes(house)) return "career";
  if ([1, 9].includes(house)) return "self";
  if ([3, 11].includes(house)) return "mind";
  if (house === 12) return "lonely";
  if (house === 4) return "self";
  return "shadow";
}

export function detectHighlights(chart: Chart): Highlight[] {
  const byBody = new Map<string, Placement>();
  for (const p of chart.placements) byBody.set(p.body, p);
  const out: Highlight[] = [];

  // 1) tight aspects (the defining "strikes")
  for (const a of chart.aspects) {
    const w = (WEIGHT[a.a] ?? 2) + (WEIGHT[a.b] ?? 2);
    const tightness = Math.max(0, 8 - a.orb); // tighter = higher
    const score = w * 2 + tightness * 3;
    const pa = byBody.get(a.a);
    const domain: Domain = pa ? houseDomain(pa.house) : "self";
    out.push({
      id: `asp-${a.a}-${a.b}`,
      kind: "aspect",
      score,
      bodies: [a.a, a.b],
      summary: `${BODY_ZH[a.a]}${ASPECT_ZH[a.type]}${BODY_ZH[a.b]}`,
      domain,
    });
  }

  // 2) angular planets (planet on an angle)
  for (const p of chart.placements) {
    if (ANGULAR_HOUSES.has(p.house)) {
      out.push({
        id: `ang-${p.body}`,
        kind: "angular",
        score: (WEIGHT[p.body] ?? 2) * 2.5 + 4,
        bodies: [p.body],
        summary: `${BODY_ZH[p.body]}${p.sign}·${p.house}宫`,
        domain: houseDomain(p.house),
      });
    }
  }

  // 3) stelliums (3+ bodies in one sign)
  const bySign = new Map<number, Placement[]>();
  for (const p of chart.placements) {
    (bySign.get(p.signIndex) ?? bySign.set(p.signIndex, []).get(p.signIndex)!).push(p);
  }
  for (const [, ps] of bySign) {
    if (ps.length >= 3) {
      out.push({
        id: `stel-${ps[0].signIndex}`,
        kind: "stellium",
        score: 14 + ps.length,
        bodies: ps.map((p) => p.body),
        summary: `${ps[0].sign}座${ps.length}星聚集`,
        domain: houseDomain(ps[0].house),
      });
    }
  }

  // 4) luminaries baseline (Sun/Moon/ASC always notable)
  for (const body of ["Sun", "Moon"] as BodyName[]) {
    const p = byBody.get(body)!;
    out.push({
      id: `lum-${body}`,
      kind: "luminary",
      score: 8,
      bodies: [body],
      summary: `${BODY_ZH[body]}${p.sign}·${p.house}宫`,
      domain: houseDomain(p.house),
    });
  }

  // de-dup by summary, keep highest score, sort, top 5
  const best = new Map<string, Highlight>();
  for (const h of out) {
    const prev = best.get(h.summary);
    if (!prev || h.score > prev.score) best.set(h.summary, h);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}
