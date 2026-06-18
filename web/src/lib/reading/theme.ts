import type { Chart, BodyName, Placement } from "@/lib/astro/chart";
import type { AppLocale } from "@/i18n/routing";
import { PLANETS, SIGNS, HOUSES } from "@/i18n/glossary";

// zh sign name (what chart.ts emits, e.g. "天蝎") → ru ("Скорпион"). Single-source
// glossary so星盘术语 never drifts across the i18n tasks.
const SIGN_ZH_TO_RU: Record<string, string> = Object.fromEntries(
  Object.values(SIGNS).map((v) => [v.zh, v.ru]),
);

// 主题深度解读 — deterministic baseline woven with the user's real placements.
// Instant render + fallback; real readings come from /api/reading, which keeps
// this scaffold's placement facts and swaps only the prose.

export type ThemeId = "love" | "wealth" | "lonely" | "self";

export interface ThemeRead {
  id: ThemeId;
  title: string;
  glyph: string;
  planetLabel: string; // e.g. ♀金星天蝎 · 第七宫
  paragraphs: { text: string; accent?: boolean; catch?: boolean }[];
  chips: string[];
  quote: string;
  deepRead: string; // 「更深一层」— the real crux, chart-anchored. Gated (honest gating §3.6):
                    // free at 懂你度≥72 (越用越准), or the variabl-ready paywall slot.
}

const HOUSE_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

// One essence phrase per sign — woven into theme-specific frames.
const ESSENCE: Record<string, string> = {
  白羊: "直接而炽热，不爱绕弯",
  金牛: "沉稳，认定了就不轻易松手",
  双子: "轻盈又善变，怕闷",
  巨蟹: "柔软而念旧，记得每个细节",
  狮子: "热烈，渴望被真正看见",
  处女: "细腻，总想把一切修到刚好",
  天秤: "讲究分寸与体面，怕失衡",
  天蝎: "深刻而决绝，要么全部要么没有",
  射手: "向往自由，眼睛总望着远方",
  摩羯: "克制能扛，把脆弱藏得很深",
  水瓶: "疏离又清醒，习惯抽身去看",
  双鱼: "易感能共情，界限常常模糊",
};

const CFG: Record<ThemeId, { title: string; glyph: string; planet: BodyName; cnPlanet: string }> = {
  love: { title: "感情与关系", glyph: "♀", planet: "Venus", cnPlanet: "金星" },
  wealth: { title: "财富与时机", glyph: "♃", planet: "Jupiter", cnPlanet: "木星" },
  lonely: { title: "孤独与归属", glyph: "☽", planet: "Moon", cnPlanet: "月亮" },
  self: { title: "自我与方向", glyph: "☉", planet: "Sun", cnPlanet: "太阳" },
};

// ── ru variants (i18n 子项目 C / M3) ──────────────────────────────────────────
// Russian deterministic baseline — NOT a machine translation but Molly's voice
// authored in Russian, woven with the SAME real placements (sign/house) as zh.
// 宪法 §8「真 vs 编」: 不夸大、不编造负面，仍是「照见」不是「算命」。
// zh tables above are byte-unchanged; ru is a new branch selected by locale.
const TITLE_RU: Record<ThemeId, string> = {
  love: "Любовь и отношения",
  wealth: "Богатство и время",
  lonely: "Одиночество и принадлежность",
  self: "Я и направление",
};

const ESSENCE_RU: Record<string, string> = {
  白羊: "прямой и пылкий, не любишь ходить вокруг да около",
  金牛: "основательный — если уж решил, не отпускаешь легко",
  双子: "лёгкий и переменчивый, боишься скуки",
  巨蟹: "мягкий и привязчивый, помнишь каждую мелочь",
  狮子: "пылкий, жаждешь, чтобы тебя по-настоящему увидели",
  处女: "тонкий, вечно хочешь всё довести до идеала",
  天秤: "ценишь меру и достоинство, боишься потерять равновесие",
  天蝎: "глубокий и решительный — либо всё, либо ничего",
  射手: "тянешься к свободе, взгляд всегда устремлён вдаль",
  摩羯: "сдержанный, умеешь терпеть, прячешь уязвимость глубоко",
  水瓶: "отстранённый и ясный, привык отходить в сторону и наблюдать",
  双鱼: "чувствительный и сопереживающий, границы часто размыты",
};

const QUOTE_RU: Record<ThemeId, string> = {
  love: "Тебе нужна не лёгкая симпатия, а полное слияние.",
  wealth: "Твои деньги идут за твоей смелостью — не за удачей.",
  lonely: "Твой главный талант — заставить всех поверить, что тебе никто не нужен.",
  self: "Ответ, который ты всё ищешь, ты давно знаешь — просто не смеешь признать.",
};

const CHIPS_RU: Record<ThemeId, string[]> = {
  love: ["Почему я всегда влюбляюсь в тех, в ком не уверена?", "Как не растратить себя в отношениях?"],
  wealth: ["Стоит ли мне действовать в этом году?", "Почему деньги у меня не задерживаются?"],
  lonely: ["Почему я скорее вынесу всё сама, чем попрошу о помощи?", "Будет ли тот, кто сможет меня подхватить?"],
  self: ["Чего я на самом деле хочу в этой жизни?", "Как мне стать собой?"],
};

function paragraphsRu(id: ThemeId, house: number, essence: string): ThemeRead["paragraphs"] {
  const dom = HOUSES[String(house)]?.ru ?? `Дом ${house}`;
  switch (id) {
    case "love":
      return [
        { text: `В любви ты ${essence}. Эта сила ложится в твой ${dom} — значит, отношения для тебя никогда не украшение, а способ убедиться, что ты существуешь.` },
        { text: `Поэтому ты боишься не отказа, а «неопределённости». Размытость мучит тебя сильнее, чем разрыв.`, accent: true },
        { text: `Это не каприз — это значит, что ты любишь по-настоящему. Не делай себя меньше ради удобного мира.`, catch: true },
      ];
    case "wealth":
      return [
        { text: `Твоё чутьё на деньги и возможности ${essence}. Оно ложится в твой ${dom} — твои деньги приходят оттого, решишься ли ты в нужный миг поставить на себя, а не от того, насколько крепко держишься.` },
        { text: `Твой настоящий риск — не потерять деньги, а из-за желания быть слишком надёжной упустить окно, которое было создано для тебя.`, accent: true },
        { text: `Когда время действовать — не медли, но домашнюю работу сделай: твоя удача всегда награждает подготовленную смелость.`, catch: true },
      ];
    case "lonely":
      return [
        { text: `То, как ты укладываешь свои чувства, ${essence}. Луна в твоём ${dom} — ты давно научилась тихо прятать саму нужду в других.` },
        { text: `Так ты стала той, кто вечно подхватывает других, но редко спрашивает: а кто подхватит меня?`, accent: true },
        { text: `Независимость — твои доспехи, но снять их иногда не слабость — это шанс для тех, кто хочет подойти ближе.`, catch: true },
      ];
    case "self":
      return [
        { text: `Основа твоего ядра ${essence}. Солнце в твоём ${dom} — настоящая задача этой жизни в том, чтобы прожить эту энергию, а не спрятать её.` },
        { text: `Ты часто сомневаешься в себе — не потому что недостаточно хороша, а потому что меряешь свой путь чужой меркой.`, accent: true },
        { text: `Направление ты давно знаешь — просто ещё не решилась признать. Позволить себе хотеть — это первый шаг.`, catch: true },
      ];
  }
}

function deepReadOfRu(id: ThemeId, dom: string): string {
  switch (id) {
    case "love":
      return `Ещё на слой глубже: ты боишься не одиночества, а «оказаться недостаточной, когда тебя разглядят». Тот, у кого Венера в ${dom}, ещё до настоящего сближения протягивает испытание — отдаёт каждым отношениям ответ на вопрос «достойна ли я любви». По-настоящему держит тебя то, что ты сама ни разу не решилась ответить на него первой.`;
    case "wealth":
      return `Ещё на слой глубже: твоя тревога о деньгах корнями не в деньгах — ты не веришь, что «спокойное благополучие» достанется именно тебе. Юпитер в ${dom} — твоя денежная сила в тот миг, когда ты «ставишь на себя»; но ты застреваешь на «а вдруг ошибусь — это докажет, что я не справляюсь». Ты бережёшь не деньги, а ту себя, что боится быть отвергнутой.`;
    case "lonely":
      return `Ещё на слой глубже: ты не то чтобы не нуждаешься в людях — ты слишком рано усвоила, что «нуждаться = опасно». Луна в ${dom} — ты спаяла просьбу о помощи с «меня отвергнут». Держит тебя не отсутствие близких, а то, что при их приближении ты первой закрываешь дверь — боль закрытой двери ты контролируешь, боль отвержения — нет.`;
    case "self":
      return `Ещё на слой глубже: ты долго не решаешься выбрать не потому, что нет направления, а потому что боишься «выбрать то, чего по-настоящему хочешь, и не справиться». Солнце в ${dom} — твоя задача прожить эту энергию; но ты застреваешь на «а вдруг это и есть весь я — и всё равно недостаточно ярок». Ты знаешь, чего хочешь, — просто не смеешь признать, что достойна этого.`;
  }
}

const QUOTE: Record<ThemeId, string> = {
  love: "你要的从不是浅浅的喜欢，是彻底的交融。",
  wealth: "你的钱，跟着你的胆走——不是跟着运气走。",
  lonely: "你最大的本事，是让所有人都以为你不需要任何人。",
  self: "你一直在找的那个答案，其实你早就知道，只是不敢承认。",
};

const CHIPS: Record<ThemeId, string[]> = {
  love: ["为什么我总爱上不确定的人？", "怎么不被一段感情消耗掉自己？"],
  wealth: ["今年我该出手吗？", "我的钱总留不住，是为什么？"],
  lonely: ["为什么我宁愿自己扛，也不肯求人？", "会有一个接得住我的人吗？"],
  self: ["我这辈子到底想要什么？", "怎么活成我自己？"],
};

const find = (c: Chart, b: BodyName) => c.placements.find((p) => p.body === b) as Placement;

// theme-specific 3-paragraph frame: how it shows / the fear / the reframe.
function paragraphs(id: ThemeId, sign: string, house: number, essence: string): ThemeRead["paragraphs"] {
  const houseZh = `第${HOUSE_ZH[house] ?? house}宫`;
  switch (id) {
    case "love":
      return [
        { text: `你在感情里，${essence}。这股劲落在${houseZh}，意味着关系对你从不是点缀，而是你确认自己存在的方式。` },
        { text: `所以你最怕的从不是被拒绝，是「不确定」。模糊，比分手更折磨你。`, accent: true },
        { text: `这不是你太作，是你爱得太真。别为了好相处，把自己改小。`, catch: true },
      ];
    case "wealth":
      return [
        { text: `你对钱与机会的嗅觉${essence}。它落在${houseZh}，说明你的财来自你敢不敢在对的时刻押上自己，而不是死守。` },
        { text: `你真正的风险，从不是亏钱，是因为想太稳，错过了那个本该属于你的窗口。`, accent: true },
        { text: `该出手时别犹豫，但功课要做足——你的运气，向来奖励有准备的胆。`, catch: true },
      ];
    case "lonely":
      return [
        { text: `你安放情绪的方式${essence}。月亮落在${houseZh}，你早就学会把需要别人这件事，悄悄收起来。` },
        { text: `于是你成了那个总在接住别人的人，却很少问：谁来接住我？`, accent: true },
        { text: `独立是你的盔甲，但偶尔卸下它，不是软弱——是给愿意靠近你的人，一个机会。`, catch: true },
      ];
    case "self":
      return [
        { text: `你内核的底色${essence}。太阳落在${houseZh}，你这一生真正的功课，是把这股能量活出来，而不是藏起来。` },
        { text: `你常常自我怀疑，不是因为你不够好，是因为你总用别人的尺，量自己的路。`, accent: true },
        { text: `方向其实你早就知道，只是还没敢承认。允许自己想要，是第一步。`, catch: true },
      ];
  }
}

// 「更深一层」— one level past the 3 paragraphs: the actual crux, anchored to the
// house. Genuinely deeper (not 伪深刻 §4.3, not fabricated §4.2), so gating it is honest.
function deepReadOf(id: ThemeId, houseZh: string): string {
  switch (id) {
    case "love":
      return `再往深一层：你怕的不是孤独，是「被看清之后，还是不够」。金星落${houseZh}的人，总在对方真正走近前，先递出一道考验——把"我值不值得被爱"留给每段关系替你回答。真正卡住你的，是你从没敢自己先回答它。`;
    case "wealth":
      return `再往深一层：你对钱的不安，根子不在钱——是你不信"稳稳的好"会落到你头上。木星落${houseZh}，你的财气在"敢押自己"那一下；可你卡在"押了万一错，就证明我不行"。你守的从不是钱，是那个怕被否定的自己。`;
    case "lonely":
      return `再往深一层：你不是不需要人，是太早学会了"需要=危险"。月亮落${houseZh}，你把求助和"被嫌弃"焊在了一起。卡住你的不是没人靠近，是有人靠近时你先关上门——关门的疼你能控制，被推开的疼你不能。`;
    case "self":
      return `再往深一层：你迟迟不敢选，不是没方向，是怕"选了真正想要的、却没做到"。太阳落${houseZh}，你的功课是把这股能量活出来；可你卡在"万一这就是我的全部、还是不够亮"。你不是不知道要什么，是不敢承认你配得上它。`;
  }
}

export function generateThemeRead(chart: Chart, id: ThemeId, locale: AppLocale = "zh"): ThemeRead {
  const cfg = CFG[id];
  const p = find(chart, cfg.planet);
  const sign = p?.sign ?? "—";
  const house = p?.house ?? 1;

  if (locale === "ru") {
    // Same real placements (sign/house), rendered with Russian astrology terms +
    // Molly's Russian voice. zh path below is byte-unchanged.
    const essenceRu = ESSENCE_RU[sign] ?? "со своим собственным ритмом";
    const ruPlanet = PLANETS[cfg.planet]?.ru ?? cfg.planet;
    const ruSign = SIGN_ZH_TO_RU[sign] ?? sign;
    const ruHouse = HOUSES[String(house)]?.ru ?? `Дом ${house}`;
    return {
      id,
      title: TITLE_RU[id],
      glyph: cfg.glyph,
      planetLabel: `${cfg.glyph}${ruPlanet} в ${ruSign} · ${ruHouse}`,
      paragraphs: paragraphsRu(id, house, essenceRu),
      chips: CHIPS_RU[id],
      quote: QUOTE_RU[id],
      deepRead: deepReadOfRu(id, ruHouse),
    };
  }

  const essence = ESSENCE[sign] ?? "有你自己的节奏";
  return {
    id,
    title: cfg.title,
    glyph: cfg.glyph,
    planetLabel: `${cfg.glyph}${cfg.cnPlanet}${sign} · 第${HOUSE_ZH[house] ?? house}宫`,
    paragraphs: paragraphs(id, sign, house, essence),
    chips: CHIPS[id],
    quote: QUOTE[id],
    deepRead: deepReadOf(id, `第${HOUSE_ZH[house] ?? house}宫`),
  };
}

export const THEME_IDS: ThemeId[] = ["love", "wealth", "lonely", "self"];
