import { bodyLongitude, SIGNS_ZH, type Chart, type BodyName } from "../astro/chart";
import type { AppLocale } from "@/i18n/routing";
import { SIGNS } from "@/i18n/glossary";
import { currentLocale } from "./locale";

// ru sign names in zodiac order (Aries..Pisces), drawn from the single-source glossary.
const SIGNS_RU = [
  SIGNS.Aries, SIGNS.Taurus, SIGNS.Gemini, SIGNS.Cancer, SIGNS.Leo, SIGNS.Virgo,
  SIGNS.Libra, SIGNS.Scorpio, SIGNS.Sagittarius, SIGNS.Capricorn, SIGNS.Aquarius, SIGNS.Pisces,
].map((s) => s.ru);

// Deterministic daily reading from REAL transits — replaces the hardcoded
// 昨/今/明 copy on /today (bug TD-3). Same chart+date → same output; different
// day → different output. No AI, instant, free, testable.
//
// 2026-06-15 fix (「换了一天还一样」): the old engine picked the single tightest
// aspect among ALL fast bodies and selected copy by a coarse (target, quality)
// bucket. Two failures fell out of that:
//   1. A slow planet (Mars/Saturn) stays within orb for 10–20 days, so it could
//      hijack "今天" and freeze the headline for weeks.
//   2. The bucket is so coarse that consecutive days landed on identical copy.
// The fix, by construction:
//   • "今天" is driven by the MOON only — the one body that genuinely moves every
//     day — so the headline tracks today, not a multi-week backdrop.
//   • Slow/inner planets are demoted to an honestly-labelled「这阵子」backdrop
//     line (backdropLine), never relabelled as today.
//   • Copy is rotated by a per-day ordinal, so even when the Moon's (target,
//     quality) bucket repeats across two days, the rendered string still differs.
// Net: every adjacent day pair differs (see daily.test.ts), and every line still
// traces to the user's natal chart and the real position of the Moon that day.

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

// the natal points a transit can aspect (luminaries/personal planets + angles)
function natalPoints(chart: Chart): { name: Target; lon: number }[] {
  return [
    ...(["Sun", "Moon", "Mercury", "Venus", "Mars", "Saturn"] as const)
      .map((b) => ({ name: b as Target, lon: chart.placements.find((p) => p.body === b)?.lon }))
      .filter((x): x is { name: Target; lon: number } => x.lon != null),
    { name: "ASC", lon: chart.asc },
    { name: "MC", lon: chart.mc },
  ];
}

function aspectQuality(asp: { q: Quality | "conj" }, transiter: BodyName): Quality {
  if (asp.q === "conj") return transiter === "Mars" || transiter === "Saturn" ? "tense" : "harm";
  return asp.q;
}

export interface DailyAspect {
  target: Target;
  quality: Quality;
}

// The MOON's tightest aspect to a natal point today. The Moon moves ~13°/day, so
// this changes almost daily — it is the genuine "today" signal. Min-orb with no
// cutoff guarantees a result (the Moon is always closest to *some* aspect).
function moonAspect(chart: Chart, date: Date): DailyAspect {
  const ml = bodyLongitude("Moon", date);
  let best: { orb: number; target: Target; quality: Quality } | null = null;
  for (const n of natalPoints(chart)) {
    const s = sep(ml, n.lon);
    for (const asp of ASPECTS) {
      const orb = Math.abs(s - asp.angle);
      if (!best || orb < best.orb) best = { orb, target: n.name, quality: aspectQuality(asp, "Moon") };
    }
  }
  return best ? { target: best.target, quality: best.quality } : { target: "Moon", quality: "harm" };
}

// Exported for tests / other callers: the day's headline aspect (Moon-driven).
export function dailyAspect(chart: Chart, date: Date): DailyAspect {
  return moonAspect(chart, date);
}

// A slow/personal-planet aspect that has been (and stays) tight for several days.
// Honestly framed as「这阵子」background — NOT today. Null when nothing notable.
const BACKDROP_BODIES: BodyName[] = ["Saturn", "Mars", "Venus", "Mercury", "Sun"];
const BACKDROP_ORB = 3; // only surface a genuinely tight, ongoing aspect
function backdropAspect(chart: Chart, date: Date): DailyAspect | null {
  const pts = natalPoints(chart);
  let best: { orb: number; target: Target; quality: Quality } | null = null;
  for (const t of BACKDROP_BODIES) {
    const tl = bodyLongitude(t, date);
    for (const n of pts) {
      if (t === n.name) continue; // a planet conjunct its own natal seat is its return, skip as backdrop noise
      const s = sep(tl, n.lon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(s - asp.angle);
        if (orb > BACKDROP_ORB) continue;
        if (!best || orb < best.orb) best = { orb, target: n.name, quality: aspectQuality(asp, t) };
      }
    }
  }
  return best ? { target: best.target, quality: best.quality } : null;
}

// ── Copy. Each bucket holds ≥2 variants; a per-day ordinal rotates them so the
// same aspect reads differently on different days. All strings are distinct. ──

const TODAY_LINES: Record<Target, Record<Quality, string[]>> = {
  Sun: {
    harm: ["今天你做自己最顺，别为了谁改方向。", "今天主场是你——按自己的节奏走，不必迁就。"],
    tense: ["有人想替你拿主意——今天守住你自己的方向。", "今天容易被人带节奏，你的主张别轻易放下。"],
  },
  Moon: {
    harm: ["情绪今天难得地稳，适合处理一直拖着的心事。", "今天心里踏实，搁了很久的情绪事可以碰一碰。"],
    tense: ["情绪容易被勾起，今天先别在情绪上做决定。", "今天心绪起伏，重要决定等情绪落地再说。"],
  },
  Mercury: {
    harm: ["今天话说得清，谈判、表态都占你的优势。", "今天脑子顺、嘴也利，该谈的该说的趁现在。"],
    tense: ["今天容易误会、说错话，重要的事写下来再发。", "今天沟通容易卡壳，话出口前多想一秒。"],
  },
  Venus: {
    harm: ["感情和钱今天都偏暖，该靠近的靠近、该谈的谈。", "今天人缘和财气都顺，关系和钱上可以往前一步。"],
    tense: ["今天容易为感情或钱让步——先别急着妥协。", "今天在感情或钱上心软，先按住别马上答应。"],
  },
  Mars: {
    harm: ["今天行动力强，想推的事现在去推。", "今天有冲劲，搁着没动的事趁势开干。"],
    tense: ["火气偏大，今天忍一句，别为小事开战。", "今天容易上头，遇到冲突先退半步。"],
  },
  Saturn: {
    harm: ["扛了很久的事今天能松一口，稳住就好。", "今天压力松了点，稳稳收个尾就够。"],
    tense: ["压力压在肩上，今天别硬扛，分一点出去。", "今天担子有点重，别一个人扛，找人搭把手。"],
  },
  ASC: {
    harm: ["今天状态在线，给人的第一印象偏好。", "今天气场不错，露面、见人都吃香。"],
    tense: ["今天容易被误读，别太在意别人怎么看你。", "今天别人看你容易走样，不必为这较劲。"],
  },
  MC: {
    harm: ["事业上今天有人看见你——别藏。", "今天工作上容易被注意到，该亮就亮。"],
    tense: ["今天别急着在工作上表态，话留三分。", "今天职场上先观望，立场不急着摊开。"],
  },
};

// short behavioral claim — the falsifiable bit /today asks「说中了吗」about.
const CLAIMS: Record<Target, Record<Quality, string[]>> = {
  Sun: { harm: ["特别想按自己的方式来", "不太想迁就别人"], tense: ["被人推着做不想做的决定", "主张被人盖过去"] },
  Moon: { harm: ["想把一件搁着的心事处理掉", "心里比平时踏实"], tense: ["情绪上来、不太想讲话", "心绪有点乱"] },
  Mercury: { harm: ["想把一件事说清楚、摊开讲", "特别想表达、想沟通"], tense: ["和人有点说不到一块", "差点说错话或被误会"] },
  Venus: { harm: ["想靠近某个人、或谈一笔钱", "在关系或钱上想往前一步"], tense: ["在感情或钱上想让步", "差点心软答应了什么"] },
  Mars: { harm: ["很想动手把一件事推进", "浑身有使不完的劲"], tense: ["容易上火、想跟人争", "差点为小事发作"] },
  Saturn: { harm: ["终于松了一口气", "把一件重担收了尾"], tense: ["觉得压力压得有点喘不过气", "被责任压得有点累"] },
  ASC: { harm: ["状态不错、想往前冲", "对自己挺有底气"], tense: ["在意别人怎么看你", "觉得被人误解"] },
  MC: { harm: ["在工作上想被看见", "想在事业上露一手"], tense: ["想在工作上表态、又有点犹豫", "职场上欲言又止"] },
};

const QUOTES: Record<Quality, string[]> = {
  harm: [
    "顺的时候，也别忘了你是怎么熬过不顺的。",
    "今天风是顺的——扬帆，但别忘了看方向。",
    "好运来的时候，配得上它的人才留得住。",
    "顺势而为，但别把功劳全交给运气。",
  ],
  tense: [
    "这不是坏日子，是宇宙让你先稳住自己。",
    "卡一下不是退步，是让你看清要往哪走。",
    "今天的阻力，是在帮你筛掉不重要的。",
    "慢下来不丢人——稳住的人才走得远。",
  ],
};

const TOMORROW_HOOK: Record<Quality, string[]> = {
  harm: [
    "明天有个温柔的相位在等你——记得回来，我有话想跟你说。",
    "明天星象偏顺，回来看看，有件好事想提醒你。",
    "明天会轻松一些，记得回来，我留了句话给你。",
  ],
  tense: [
    "明天有点小考验，回来，我陪你一起过。",
    "明天星象有点紧，记得回来，我帮你提前看一眼。",
    "明天需要稳一稳，回来，我们一起接住它。",
  ],
};

// transiting Moon sign → element → today's emotional weather (rotated per day)
const ELEMENTS = ["火", "土", "风", "水"] as const;
const WEATHER: Record<(typeof ELEMENTS)[number], string[]> = {
  火: ["情绪偏冲，宜动忌闷", "心气偏旺，适合往前、别憋着"],
  土: ["情绪偏稳，宜踏实忌冒进", "心比平时沉得住，适合慢慢来"],
  风: ["思绪偏活，宜交流忌钻牛角尖", "脑子转得快，适合多聊少独想"],
  水: ["情绪偏深，宜独处忌硬撑", "心思偏细，适合安静、别硬扛"],
};

// slow-planet backdrop — explicitly「这阵子」, multi-day, never "today"
const BACKDROP_LINES: Record<Target, Record<Quality, string>> = {
  Sun: { harm: "这阵子你整个人的方向感在变清楚。", tense: "这阵子有股力量在考验你的主心骨。" },
  Moon: { harm: "这阵子情绪的底色比较暖。", tense: "这阵子心里有件事没完全放下。" },
  Mercury: { harm: "这阵子你想把一些事彻底想明白。", tense: "这阵子脑子有点绕，容易反复琢磨。" },
  Venus: { harm: "这阵子感情或钱的运势在回暖。", tense: "这阵子在关系或钱上有道题要解。" },
  Mars: { harm: "这阵子你做事更有推进力。", tense: "这阵子火气和冲突的张力偏高，悠着点。" },
  Saturn: { harm: "这阵子你在把一件长期的事慢慢扛稳。", tense: "这阵子有副担子压着，是长线的功课。" },
  ASC: { harm: "这阵子你给外界的样子更立得住。", tense: "这阵子你和外界的磨合有点费劲。" },
  MC: { harm: "这阵子事业上有上升的暗流。", tense: "这阵子职业方向上有压力在推你调整。" },
};

// ── ru copy (i18n 子项目 C / M3). Mirrors the zh structure 1:1 (same pools, same
// variant counts) so the per-day rotation + adjacent-day-differ contract holds
// identically in Russian. Molly's voice, authored in ru — not machine-translated.
// 宪法 §8「真 vs 编」: tomorrow-hook 是真实相位的中性提醒，不编造坏后果/愧疚 (§8.2)。──
const TODAY_LINES_RU: Record<Target, Record<Quality, string[]>> = {
  Sun: {
    harm: ["Сегодня легче всего быть собой — не меняй курс ради кого-то.", "Сегодня площадка твоя — иди в своём ритме, никому не подстраиваясь."],
    tense: ["Кто-то хочет решить за тебя — сегодня удержи своё направление.", "Сегодня легко поддаться чужому темпу, не отпускай свою позицию."],
  },
  Moon: {
    harm: ["Эмоции сегодня на редкость устойчивы — самое время заняться давно отложенным на сердце.", "Сегодня на душе спокойно, можно коснуться того, что долго откладывала."],
    tense: ["Чувства легко вспыхивают — сегодня не принимай решений на эмоциях.", "Сегодня настроение качает, важные решения отложи, пока не уляжется."],
  },
  Mercury: {
    harm: ["Сегодня речь ясна — переговоры и заявления тебе на руку.", "Сегодня и голова, и язык послушны — что нужно обсудить и сказать, делай сейчас."],
    tense: ["Сегодня легко недопонять или сказать лишнее — важное запиши, прежде чем отправлять.", "Сегодня общение буксует — подумай лишнюю секунду, прежде чем сказать."],
  },
  Venus: {
    harm: ["Чувства и деньги сегодня теплеют — сближайся с кем нужно, обсуждай что нужно.", "Сегодня и в людях, и в деньгах попутный ветер — в отношениях и финансах можно шагнуть вперёд."],
    tense: ["Сегодня легко уступить ради чувств или денег — не спеши соглашаться.", "Сегодня сердце смягчается в любви и деньгах — придержи, не отвечай сразу «да»."],
  },
  Mars: {
    harm: ["Сегодня много действия — то, что хотела продвинуть, продвигай сейчас.", "Сегодня есть напор — за дело, что давно стоит на месте, берись на этой волне."],
    tense: ["Огня многовато — сегодня сдержи слово, не воюй из-за мелочей.", "Сегодня легко вскипеть — при стычке сделай полшага назад."],
  },
  Saturn: {
    harm: ["То, что долго тащила, сегодня даёт выдохнуть — просто удержи стабильность.", "Сегодня давление чуть отпустило — спокойно подведи итог, этого хватит."],
    tense: ["Груз на плечах — сегодня не тяни в одиночку, часть отдай.", "Сегодня ноша тяжеловата — не неси одна, попроси подставить плечо."],
  },
  ASC: {
    harm: ["Сегодня ты в форме, первое впечатление работает на тебя.", "Сегодня твоё поле хорошо — показываться и встречаться людям к лицу."],
    tense: ["Сегодня тебя легко прочесть неверно — не принимай близко чужие оценки.", "Сегодня твой образ легко искажается — не стоит из-за этого спорить."],
  },
  MC: {
    harm: ["В делах сегодня тебя замечают — не прячься.", "Сегодня на работе легко обратить на себя внимание — где можно блеснуть, блесни."],
    tense: ["Сегодня не спеши заявлять позицию в работе — оставь слова при себе.", "Сегодня на работе сперва понаблюдай, позицию раскрывать не торопись."],
  },
};

const CLAIMS_RU: Record<Target, Record<Quality, string[]>> = {
  Sun: { harm: ["особенно хотелось делать по-своему", "не очень хотелось под кого-то подстраиваться"], tense: ["кто-то подталкивал к нежеланному решению", "твою позицию кто-то перекрыл"] },
  Moon: { harm: ["хотелось разобраться с отложенным на сердце", "на душе было спокойнее обычного"], tense: ["накатили эмоции, говорить не хотелось", "на душе было немного смутно"] },
  Mercury: { harm: ["хотелось проговорить и выложить всё начистоту", "особенно тянуло выразиться, пообщаться"], tense: ["с кем-то не сходились во мнениях", "чуть не сказала лишнего или была неверно понята"] },
  Venus: { harm: ["хотелось сблизиться с кем-то или обсудить деньги", "в отношениях или деньгах хотелось шагнуть вперёд"], tense: ["в любви или деньгах хотелось уступить", "чуть не согласилась на что-то по мягкости"] },
  Mars: { harm: ["очень хотелось взяться и продвинуть дело", "энергии было через край"], tense: ["легко вспыхивала, тянуло спорить", "чуть не сорвалась из-за мелочи"] },
  Saturn: { harm: ["наконец-то выдохнула", "довела до конца тяжёлое дело"], tense: ["давление давило так, что трудно дышать", "от ответственности немного устала"] },
  ASC: { harm: ["была в форме, хотелось вперёд", "чувствовала уверенность в себе"], tense: ["беспокоило, как тебя видят другие", "казалось, что тебя не так поняли"] },
  MC: { harm: ["хотелось, чтобы заметили на работе", "хотелось проявить себя в деле"], tense: ["хотелось заявить позицию в работе, но колебалась", "на работе слова застревали"] },
};

const QUOTES_RU: Record<Quality, string[]> = {
  harm: [
    "Когда всё гладко, не забывай, как ты выстояла в негладкие дни.",
    "Сегодня ветер попутный — поднимай парус, но не теряй направление из виду.",
    "Когда приходит удача, удержит её лишь тот, кто её достоин.",
    "Иди по течению, но не отдавай всю заслугу удаче.",
  ],
  tense: [
    "Это не плохой день — Вселенная просто просит сначала устоять самой.",
    "Заминка — не шаг назад, а возможность яснее увидеть, куда идти.",
    "Сегодняшнее сопротивление помогает тебе отсеять неважное.",
    "Замедлиться не стыдно — дальше уходит тот, кто умеет устоять.",
  ],
};

const TOMORROW_HOOK_RU: Record<Quality, string[]> = {
  harm: [
    "Завтра тебя ждёт мягкий аспект — возвращайся, мне есть что тебе сказать.",
    "Завтра небо благосклонно — загляни, хочу напомнить тебе об одной хорошей вещи.",
    "Завтра будет полегче — возвращайся, я оставила для тебя пару слов.",
  ],
  tense: [
    "Завтра небольшое испытание — возвращайся, пройдём его вместе.",
    "Завтра небо чуть напряжённое — возвращайся, я загляну вперёд за тебя.",
    "Завтра нужно будет устоять — возвращайся, подхватим это вместе.",
  ],
};

const WEATHER_RU: Record<(typeof ELEMENTS)[number], string[]> = {
  火: ["Эмоции рвутся вперёд — действуй, не зажимайся", "Дух на подъёме — самое то двигаться вперёд, не копи в себе"],
  土: ["Эмоции устойчивы — стой твёрдо, без рывков", "На душе спокойнее обычного — самое то не спешить"],
  风: ["Мысли оживлены — общайся, не зацикливайся на одном", "Голова работает быстро — больше говори, меньше копайся в одиночку"],
  水: ["Эмоции глубоки — побудь одна, не тяни через силу", "Мысли тонкие — самое то тишина, не дави на себя"],
};

const BACKDROP_LINES_RU: Record<Target, Record<Quality, string>> = {
  Sun: { harm: "В эти дни у тебя проясняется чувство направления.", tense: "В эти дни некая сила испытывает твой внутренний стержень." },
  Moon: { harm: "В эти дни эмоциональный фон скорее тёплый.", tense: "В эти дни на сердце есть нечто не до конца отпущенное." },
  Mercury: { harm: "В эти дни хочется додумать кое-что до конца.", tense: "В эти дни мысли путаются, тянет всё пережёвывать." },
  Venus: { harm: "В эти дни в любви или деньгах теплеет.", tense: "В эти дни в отношениях или деньгах есть задача, которую надо решить." },
  Mars: { harm: "В эти дни у тебя больше пробивной силы в делах.", tense: "В эти дни напряжение огня и конфликтов высоко — полегче." },
  Saturn: { harm: "В эти дни ты понемногу удерживаешь долгое тяжёлое дело.", tense: "В эти дни давит одна ноша — это долгая работа." },
  ASC: { harm: "В эти дни твой образ для внешнего мира держится крепче.", tense: "В эти дни притирка с внешним миром даётся непросто." },
  MC: { harm: "В эти дни в делах есть восходящее течение.", tense: "В эти дни в карьерном направлении есть давление, толкающее к перестройке." },
};

const DAY_MS = 86_400_000;

// integer that increments by 1 each LOCAL calendar day (consecutive days differ),
// so `pick(pool, ordinal)` is stable within a day and rotates between days.
function dayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}
function pick<T>(pool: T[], ordinal: number): T {
  return pool[((ordinal % pool.length) + pool.length) % pool.length];
}

function moonWeather(date: Date, ordinal: number, locale: AppLocale): { sign: string; line: string } {
  const idx = signIndexOf(bodyLongitude("Moon", date));
  const el = ELEMENTS[idx % 4]; // 0白羊→火,1金牛→土,2双子→风,3巨蟹→水, repeats
  const signs = locale === "ru" ? SIGNS_RU : SIGNS_ZH;
  const weather = locale === "ru" ? WEATHER_RU : WEATHER;
  return { sign: signs[idx], line: pick(weather[el], ordinal) };
}

export interface DailyReading {
  moonSign: string;
  moonLine: string;
  yesterdayClaim: string; // what we (would have) predicted for yesterday
  todayLine: string;
  todayQuote: string;
  tomorrowHook: string;
  backdropLine: string | null; // slow-planet「这阵子」backdrop, or null
  quality: Quality;
}

export function dailyReading(chart: Chart, date: Date, locale: AppLocale = currentLocale()): DailyReading {
  const ord = dayOrdinal(date);
  const today = moonAspect(chart, date);

  const yDate = new Date(date.getTime() - DAY_MS);
  const yest = moonAspect(chart, yDate);
  const tDate = new Date(date.getTime() + DAY_MS);
  const tom = moonAspect(chart, tDate);

  const w = moonWeather(date, ord, locale);
  const bd = backdropAspect(chart, date);

  // locale=ru selects the parallel ru tables (1:1 with zh structure → identical
  // rotation, freshness contract holds in ru). zh (default) is byte-unchanged.
  const ru = locale === "ru";
  const TODAY = ru ? TODAY_LINES_RU : TODAY_LINES;
  const CLAIM = ru ? CLAIMS_RU : CLAIMS;
  const QUOTE = ru ? QUOTES_RU : QUOTES;
  const HOOK = ru ? TOMORROW_HOOK_RU : TOMORROW_HOOK;
  const BACKDROP = ru ? BACKDROP_LINES_RU : BACKDROP_LINES;

  return {
    moonSign: w.sign,
    moonLine: w.line,
    yesterdayClaim: pick(CLAIM[yest.target][yest.quality], dayOrdinal(yDate)),
    todayLine: pick(TODAY[today.target][today.quality], ord),
    todayQuote: pick(QUOTE[today.quality], ord),
    tomorrowHook: pick(HOOK[tom.quality], dayOrdinal(tDate)),
    backdropLine: bd ? BACKDROP[bd.target][bd.quality] : null,
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
