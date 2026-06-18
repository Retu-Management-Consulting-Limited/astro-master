import type { Chart, BodyName } from "./chart";

// Deterministic classical-astrology JUDGMENTS derived from a chart — the layer
// that makes a reading chart-specific instead of generic. Pure functions; the
// AI is *told* these facts and writes prose, it never computes or invents them.
// (Track B Phase 1. Sources: traditional rulerships + Lilly dignity scores +
// Dorothean triplicities. Verified against Kevin's chart in dignities.test.ts.)

const norm360 = (d: number) => ((d % 360) + 360) % 360;
const signOf = (lon: number) => Math.floor(norm360(lon) / 30) % 12;
// shortest angular separation, 0..180
export const angSep = (a: number, b: number) => {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
};

export type Sect = "diurnal" | "nocturnal";
export type DignityStatus =
  | "domicile" | "exaltation" | "triplicity" | "detriment" | "fall" | "peregrine" | "none";
export interface Dignity { status: DignityStatus; score: number }
export type CombustState = "cazimi" | "combust" | "under-beams" | "free";

// sign indices 0=Aries..11=Pisces
const CLASSICAL: BodyName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const DOMICILE: Partial<Record<BodyName, number[]>> = {
  Sun: [4], Moon: [3], Mercury: [2, 5], Venus: [1, 6], Mars: [0, 7], Jupiter: [8, 11], Saturn: [9, 10],
};
const EXALT_SIGN: Partial<Record<BodyName, number>> = {
  Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6,
};
// sign index → traditional domicile ruler
const SIGN_RULER: BodyName[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];
// element = signIndex % 4 → 0 Fire, 1 Earth, 2 Air, 3 Water. Dorothean day/night rulers.
const TRIPLICITY: Record<number, { day: BodyName; night: BodyName }> = {
  0: { day: "Sun", night: "Jupiter" },
  1: { day: "Venus", night: "Moon" },
  2: { day: "Saturn", night: "Mercury" },
  3: { day: "Venus", night: "Mars" },
};

const opposite = (sign: number) => (sign + 6) % 12;

// Sun above the horizon ⇒ diurnal. The ascendant rises in increasing longitude,
// so degrees already above the horizon sit 0–180° *behind* the ASC.
export function sect(sunLon: number, ascLon: number): Sect {
  return norm360(ascLon - sunLon) < 180 ? "diurnal" : "nocturnal";
}

export function essentialDignity(body: BodyName, lon: number, s?: Sect): Dignity {
  const dom = DOMICILE[body];
  if (!dom) return { status: "none", score: 0 }; // outer planets: no classical dignity
  const sign = signOf(lon);
  if (dom.includes(sign)) return { status: "domicile", score: 5 };
  if (EXALT_SIGN[body] === sign) return { status: "exaltation", score: 4 };
  if (dom.some((d) => opposite(d) === sign)) return { status: "detriment", score: -5 };
  if (opposite(EXALT_SIGN[body]!) === sign) return { status: "fall", score: -4 };
  if (s) {
    const tri = TRIPLICITY[sign % 4];
    if ((s === "diurnal" ? tri.day : tri.night) === body) return { status: "triplicity", score: 3 };
  }
  return { status: "peregrine", score: -5 };
}

export function chartRuler(ascSignIndex: number): BodyName {
  return SIGN_RULER[((ascSignIndex % 12) + 12) % 12];
}

export function combustState(planetLon: number, sunLon: number): CombustState {
  const sep = angSep(planetLon, sunLon);
  if (sep <= 0.283) return "cazimi";   // within 17'
  if (sep <= 8.5) return "combust";
  if (sep <= 17) return "under-beams";
  return "free";
}

const STATUS_ZH: Record<DignityStatus, string> = {
  domicile: "入庙", exaltation: "旺", triplicity: "三方", detriment: "陷", fall: "落", peregrine: "漂泊", none: "",
};
const COMBUST_ZH: Record<CombustState, string> = {
  cazimi: "日心(cazimi)", combust: "焦伤", "under-beams": "在日光下", free: "",
};

// Russian renderings of the classical interpretive vocabulary (i18n 子项目 C / M2).
// Standard traditional-astrology Russian terms — domain vocabulary, not marketing copy
// (native polish deferred to D). Exported so the Molly ru fact-serializer (molly.ts)
// can render the SAME structured InterpretiveFacts in Russian instead of re-translating
// the zh prose. zh maps stay private + byte-unchanged.
export const STATUS_RU: Record<DignityStatus, string> = {
  domicile: "в обители", exaltation: "в экзальтации", triplicity: "в тригоне",
  detriment: "в изгнании", fall: "в падении", peregrine: "перегрин", none: "",
};
export const COMBUST_RU: Record<CombustState, string> = {
  cazimi: "казими", combust: "под сожжением", "under-beams": "под лучами Солнца", free: "",
};
export const SECT_RU: Record<Sect, string> = {
  diurnal: "дневная карта", nocturnal: "ночная карта",
};
const PLANET_ZH: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
};

export interface PlanetFact {
  body: BodyName;
  dignity: Dignity;
  combust: CombustState;
}
export interface InterpretiveFacts {
  sect: Sect;
  chartRuler: { body: BodyName; sign: string; house: number; dignity: Dignity; combust: CombustState };
  planets: PlanetFact[];
  text: string; // compact zh rendering for the prompt
}

// Derive the deterministic interpretive layer from a computed chart. All values
// trace to the chart — nothing fabricated (note: the engine does not track
// retrograde, so retrograde is intentionally NOT asserted here).
export function interpretiveFacts(chart: Chart): InterpretiveFacts {
  const by = (b: BodyName) => chart.placements.find((p) => p.body === b);
  const sun = by("Sun");
  const sunLon = sun?.lon ?? 0;
  const s = sect(sunLon, chart.asc);

  const rulerBody = chartRuler(chart.ascSignIndex);
  const rp = by(rulerBody);
  const ruler = {
    body: rulerBody,
    sign: rp?.sign ?? "",
    house: rp?.house ?? 0,
    dignity: rp ? essentialDignity(rulerBody, rp.lon, s) : { status: "none" as const, score: 0 },
    combust: rp && rulerBody !== "Sun" ? combustState(rp.lon, sunLon) : ("free" as CombustState),
  };

  const planets: PlanetFact[] = CLASSICAL.map((b) => {
    const p = by(b);
    return {
      body: b,
      dignity: p ? essentialDignity(b, p.lon, s) : { status: "none" as const, score: 0 },
      combust: p && b !== "Sun" ? combustState(p.lon, sunLon) : ("free" as CombustState),
    };
  });

  const rulerDig = STATUS_ZH[ruler.dignity.status];
  const rulerCmb = COMBUST_ZH[ruler.combust];
  const planetBits = planets
    .filter((p) => STATUS_ZH[p.dignity.status] || COMBUST_ZH[p.combust])
    .map((p) => {
      const parts = [STATUS_ZH[p.dignity.status], COMBUST_ZH[p.combust]].filter(Boolean);
      return `${PLANET_ZH[p.body]}${parts.join("·")}`;
    });

  const text =
    `${s === "diurnal" ? "日生盘" : "夜生盘"}；` +
    `命主星 ${PLANET_ZH[ruler.body]}${rulerDig ? `（${rulerDig}）` : ""}` +
    `${ruler.sign ? `落${ruler.sign}、第${ruler.house}宫` : ""}${rulerCmb ? `、${rulerCmb}` : ""}。` +
    (planetBits.length ? `行星状态：${planetBits.join("；")}。` : "");

  return { sect: s, chartRuler: ruler, planets, text };
}
