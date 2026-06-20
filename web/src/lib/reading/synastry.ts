import type { SynResult, RelType } from "@/lib/astro/synastry";
import type { AppLocale } from "@/i18n/routing";
import { currentLocale } from "./locale";

// Per-RelType deterministic synastry reading. Replaces the old 5-type-shared
// mad-lib (synastry/page.tsx reading()), whose "得有一个人先松口" catch-line was
// flat-out wrong for colleagues/friends. Serves two jobs (mirrors lib/reading
// theme/generate): the INSTANT render before the LLM lands, and the graceful
// FALLBACK when AI is off / rate-limited / errors. Even the fallback is per-type
// — never a shared template, or mad-lib isn't actually dead.
//
// Voice: D5 (狠一点) within Constitution §8.1 (狠 from the REAL low dimension, not
// fabricated) and §10 (every catch-line still points at an agency move — who
// speaks up / who softens — never leaves the pair only in the wound).

export interface SynRead {
  vibe: string;
  body: string;
  catchLine: string;
}

const strip = (label: string) => label.replace(/^[^一-龥]+/, ""); // drop the emoji prefix (zh word follows)
// ru labels carry the same emoji prefix but a Cyrillic word; drop everything up to
// the first Cyrillic letter so the word survives (the zh strip above would eat it all).
const stripRu = (label: string) => label.replace(/^[^А-Яа-яЁё]+/, "");

interface Tmpl {
  vibe: (hn: string, ln: string) => string;
  body: (p: { hn: string; hv: number; ln: string; lv: number }) => string;
  catchLine: (hn: string, ln: string) => string;
}

const BANK: Record<RelType, Tmpl> = {
  lover: {
    vibe: (hn, ln) => `${hn}够烈，但${ln}是你们的暗礁`,
    body: ({ hn, hv, ln, lv }) => `你俩最烈的是「${hn}」——${hv} 分，一碰就来电。可「${ln}」只有 ${lv}：这块补不上，再烫的火也会凉。`,
    catchLine: (_hn, ln) => `你俩不会输给不爱，会输给都太硬——谁都赌对方先在「${ln}」上低头。`,
  },
  partner: {
    vibe: (hn, ln) => `${hn}能成事，但${ln}是你们的雷区`,
    body: ({ hn, hv, ln, lv }) => `你俩最值钱的是「${hn}」——${hv} 分，搭起来真能赚钱。可「${ln}」只有 ${lv}：这点不摊开，分钱那天就翻脸。`,
    catchLine: (_hn, ln) => `你俩的死穴不是能力，是「${ln}」从没讲清——不讲，迟早把彼此拖死。`,
  },
  colleague: {
    vibe: (hn, ln) => `${hn}能配合，但${ln}是你们的内耗源`,
    body: ({ hn, hv, ln, lv }) => `你俩最顺的是「${hn}」——${hv} 分，事能往前推。可「${ln}」只有 ${lv}：这条不划清，合作越久越互相磨。`,
    catchLine: (_hn, ln) => `你俩不会败给能力，会败给「${ln}」没人先说破——憋着，迟早互相消耗。`,
  },
  friend: {
    vibe: (hn, ln) => `${hn}够深，但${ln}是你们的隐患`,
    body: ({ hn, hv, ln, lv }) => `你俩最真的是「${hn}」——${hv} 分，是能交心的底。可「${ln}」只有 ${lv}：这块不顾，处久了会悄悄磨没。`,
    catchLine: (_hn, ln) => `你俩不会散于没感情，会散于「${ln}」——总有人忍着不说，忍到不想再忍。`,
  },
  family: {
    vibe: (hn, ln) => `${hn}还在，但${ln}是你们的旧伤`,
    body: ({ hn, hv, ln, lv }) => `你俩最深的是「${hn}」——${hv} 分，是血里的牵。可「${ln}」只有 ${lv}：这道伤没解，再亲也会刺到彼此。`,
    catchLine: (_hn, ln) => `你俩不缺爱，缺的是「${ln}」上谁先松口——都端着，就一直疼下去。`,
  },
};

// Russian per-RelType scaffold. Faithful mirror of the zh BANK: same structure
// (vibe = the high/low tension, body = strongest/weakest + the cost, catchLine =
// the screenshot-able line pointing at an agency move), same intensity — never
// softened, never amplified beyond what the real low dimension already says (§8.1).
// zh path stays byte-unchanged; this branch is selected only on /ru.
const BANK_RU: Record<RelType, Tmpl> = {
  lover: {
    vibe: (hn, ln) => `${hn} — на полную, но ${ln} — ваш риф`,
    body: ({ hn, hv, ln, lv }) => `Сильнее всего у вас «${hn}» — ${hv}, искрит с первого касания. Но «${ln}» всего ${lv}: это не закрыть, и даже самый жаркий огонь остынет.`,
    catchLine: (_hn, ln) => `Вас погубит не нелюбовь, а упрямство — каждый ждёт, кто первым уступит в «${ln}».`,
  },
  partner: {
    vibe: (hn, ln) => `${hn} — сработает, но ${ln} — ваше минное поле`,
    body: ({ hn, hv, ln, lv }) => `Дороже всего у вас «${hn}» — ${hv}, вместе и правда заработаете. Но «${ln}» всего ${lv}: не проговорите это — поссоритесь в день дележа денег.`,
    catchLine: (_hn, ln) => `Ваша слабина не в навыках, а в «${ln}», что так и не прояснили — молчание рано или поздно вас доконает.`,
  },
  colleague: {
    vibe: (hn, ln) => `${hn} — сладится, но ${ln} — источник трений`,
    body: ({ hn, hv, ln, lv }) => `Ровнее всего у вас «${hn}» — ${hv}, дело движется вперёд. Но «${ln}» всего ${lv}: не разграничите это — чем дольше работаете, тем сильнее изматываете друг друга.`,
    catchLine: (_hn, ln) => `Вас подведут не способности, а «${ln}», о котором никто не скажет вслух — будете копить и истощать друг друга.`,
  },
  friend: {
    vibe: (hn, ln) => `${hn} — глубоко, но ${ln} — ваша скрытая угроза`,
    body: ({ hn, hv, ln, lv }) => `Искреннее всего у вас «${hn}» — ${hv}, на этом можно открыть душу. Но «${ln}» всего ${lv}: не позаботитесь — со временем тихо сотрётся.`,
    catchLine: (_hn, ln) => `Вас разведёт не отсутствие чувств, а «${ln}» — кто-то всё терпит молча, пока не устанет терпеть.`,
  },
  family: {
    vibe: (hn, ln) => `${hn} — ещё живо, но ${ln} — ваша старая рана`,
    body: ({ hn, hv, ln, lv }) => `Глубже всего у вас «${hn}» — ${hv}, это родство в крови. Но «${ln}» всего ${lv}: рана не залечена, и даже самые близкие ранят друг друга.`,
    catchLine: (_hn, ln) => `Вам не любви не хватает, а того, чтобы кто-то первым уступил в «${ln}» — пока держите лицо, боль не уйдёт.`,
  },
};

export function synScaffold(result: SynResult, _selfName?: string, _otherName?: string, locale: AppLocale = currentLocale()): SynRead {
  const dims = [...result.dims].sort((a, b) => b.value - a.value);
  const hi = dims[0];
  const lo = dims[dims.length - 1];
  const ru = locale === "ru";
  const hn = ru ? stripRu(hi.label) : strip(hi.label);
  const ln = ru ? stripRu(lo.label) : strip(lo.label);
  const t = (ru ? BANK_RU : BANK)[result.type];
  return {
    vibe: t.vibe(hn, ln),
    body: t.body({ hn, hv: hi.value, ln, lv: lo.value }),
    catchLine: t.catchLine(hn, ln),
  };
}
