import { bodyLongitude, SIGNS_ZH, type Chart, type BodyName } from "../astro/chart";

// Deterministic daily reading from REAL transits — replaces the hardcoded
// 昨/今/明 copy on /today (bug TD-3). Same chart+date → same output; different
// day or different chart → different output. No AI, instant, free, testable.
// The point: every line traces to the user's natal chart and the actual date.

type Quality = "harm" | "tense";
type Target = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Saturn" | "ASC" | "MC";

const ASPECTS: { angle: number; q: Quality | "conj" }[] = [
  { angle: 0, q: "conj" },
  { angle: 60, q: "harm" },
  { angle: 90, q: "tense" },
  { angle: 120, q: "harm" },
  { angle: 180, q: "tense" },
];

function sep(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
function signIndexOf(lon: number) {
  return Math.floor((((lon % 360) + 360) % 360) / 30) % 12;
}

// today's tightest fast-transit aspect to a natal point → (target, quality)
const TRANSITERS: BodyName[] = ["Moon", "Sun", "Mercury", "Venus", "Mars"];

export interface DailyAspect {
  target: Target;
  quality: Quality;
}

export function dailyAspect(chart: Chart, date: Date): DailyAspect {
  const natal: { name: Target; lon: number }[] = [
    ...(["Sun", "Moon", "Mercury", "Venus", "Mars", "Saturn"] as const).map((b) => ({
      name: b as Target,
      lon: chart.placements.find((p) => p.body === b)?.lon,
    })).filter((x): x is { name: Target; lon: number } => x.lon != null),
    { name: "ASC", lon: chart.asc },
    { name: "MC", lon: chart.mc },
  ];

  let best: { orb: number; target: Target; quality: Quality } | null = null;
  for (const t of TRANSITERS) {
    const tl = bodyLongitude(t, date);
    const orbLimit = t === "Moon" ? 7 : 5;
    for (const n of natal) {
      const s = sep(tl, n.lon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(s - asp.angle);
        if (orb > orbLimit) continue;
        let q: Quality;
        if (asp.q === "conj") q = t === "Mars" || t === "Saturn" ? "tense" : "harm";
        else q = asp.q;
        if (!best || orb < best.orb) best = { orb, target: n.name, quality: q };
      }
    }
  }
  // Moon aspects something almost every day; fallback keeps it total.
  if (!best) return { target: "Moon", quality: "harm" };
  return { target: best.target, quality: best.quality };
}

// theme phrasing per natal point × quality. Templated but selected by real data.
const TODAY_LINES: Record<Target, Record<Quality, string>> = {
  Sun: { harm: "今天你做自己最顺，别为了谁改方向。", tense: "有人想替你拿主意——今天守住你自己的方向。" },
  Moon: { harm: "情绪今天难得地稳，适合处理一直拖着的心事。", tense: "情绪容易被勾起，今天先别在情绪上做决定。" },
  Mercury: { harm: "今天话说得清，谈判、表态都占你的优势。", tense: "今天容易误会、说错话，重要的事写下来再发。" },
  Venus: { harm: "感情和钱今天都偏暖，该靠近的靠近、该谈的谈。", tense: "今天容易为感情或钱让步——先别急着妥协。" },
  Mars: { harm: "今天行动力强，想推的事现在去推。", tense: "火气偏大，今天忍一句，别为小事开战。" },
  Saturn: { harm: "扛了很久的事今天能松一口，稳住就好。", tense: "压力压在肩上，今天别硬扛，分一点出去。" },
  ASC: { harm: "今天状态在线，给人的第一印象偏好。", tense: "今天容易被误读，别太在意别人怎么看你。" },
  MC: { harm: "事业上今天有人看见你——别藏。", tense: "今天别急着在工作上表态，话留三分。" },
};

// short behavioral claim — the falsifiable bit /today asks「说中了吗」about.
const CLAIMS: Record<Target, Record<Quality, string>> = {
  Sun: { harm: "特别想按自己的方式来", tense: "被人推着做不想做的决定" },
  Moon: { harm: "想把一件搁着的心事处理掉", tense: "情绪上来、不太想讲话" },
  Mercury: { harm: "想把一件事说清楚、摊开讲", tense: "和人有点说不到一块" },
  Venus: { harm: "想靠近某个人、或谈一笔钱", tense: "在感情或钱上想让步" },
  Mars: { harm: "很想动手把一件事推进", tense: "容易上火、想跟人争" },
  Saturn: { harm: "终于松了一口气", tense: "觉得压力压得有点喘不过气" },
  ASC: { harm: "状态不错、想往前冲", tense: "在意别人怎么看你" },
  MC: { harm: "在工作上想被看见", tense: "想在工作上表态、又有点犹豫" },
};

const QUOTES: Record<Quality, string> = {
  harm: "顺的时候，也别忘了你是怎么熬过不顺的。",
  tense: "这不是坏日子，是宇宙让你先稳住自己。",
};

const TOMORROW_HOOK: Record<Quality, string> = {
  harm: "明天有个温柔的相位在等你——记得回来，我有话想跟你说。",
  tense: "明天有点小考验，回来，我陪你一起过。",
};

// transiting Moon sign element → today's emotional weather (always present)
const ELEMENT_LINE = ["火", "土", "风", "水"];
function moonWeather(date: Date): { sign: string; line: string } {
  const idx = signIndexOf(bodyLongitude("Moon", date));
  const el = idx % 4; // 0白羊→火, 1金牛→土, 2双子→风, 3巨蟹→水, repeats
  const lines = ["情绪偏冲，宜动忌闷", "情绪偏稳，宜踏实忌冒进", "思绪偏活，宜交流忌钻牛角尖", "情绪偏深，宜独处忌硬撑"];
  return { sign: SIGNS_ZH[idx], line: lines[ELEMENT_LINE.indexOf(["火", "土", "风", "水"][el])] ?? lines[el] };
}

const DAY_MS = 86_400_000;

export interface DailyReading {
  moonSign: string;
  moonLine: string;
  yesterdayClaim: string; // what we (would have) predicted for yesterday
  todayLine: string;
  todayQuote: string;
  tomorrowHook: string;
  quality: Quality;
}

export function dailyReading(chart: Chart, date: Date): DailyReading {
  const today = dailyAspect(chart, date);
  const yest = dailyAspect(chart, new Date(date.getTime() - DAY_MS));
  const w = moonWeather(date);
  return {
    moonSign: w.sign,
    moonLine: w.line,
    yesterdayClaim: CLAIMS[yest.target][yest.quality],
    todayLine: TODAY_LINES[today.target][today.quality],
    todayQuote: QUOTES[today.quality],
    tomorrowHook: TOMORROW_HOOK[dailyAspect(chart, new Date(date.getTime() + DAY_MS)).quality],
    quality: today.quality,
  };
}

// a stable yyyy-mm-dd key for per-day persistence (mood, feedback)
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Honest gate for the 昨天「说中了吗」card: only ask the user to validate
// "我说你昨天会X" if they were around on an earlier calendar day — never on day 1
// (we never showed them a prediction yesterday). Retrospective validation must be
// of something actually shown (T-1, audit-2 / CLAUDE.md house rule).
export function existedYesterday(joinedAt: number | undefined, now: Date): boolean {
  if (!joinedAt) return false;
  return dayKey(new Date(joinedAt)) < dayKey(now); // joined on a strictly earlier calendar day
}
