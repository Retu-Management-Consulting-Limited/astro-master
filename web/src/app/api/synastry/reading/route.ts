import { NextResponse } from "next/server";
import type { Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { synastry, type RelType, type SynResult } from "@/lib/astro/synastry";
import { synScaffold, type SynRead } from "@/lib/reading/synastry";
import { safetyFor, facts, personaFor, pronoun, langDirective, type Gender } from "@/lib/ai/molly";
import { runLLM } from "@/lib/ai/llm";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { cacheGet, cacheSet } from "@/lib/server/store";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { logUsage } from "@/lib/server/cost";

export const runtime = "nodejs";
export const maxDuration = 120;

// Per-RelType synastry reading. Same discipline as /api/reading: Claude writes
// ONLY the prose — every astrological fact (the dimensions, the cross-aspects) is
// computed deterministically and passed in; the model may not invent aspects
// (§4.2). Falls back to the deterministic per-type scaffold on any failure, so
// the user never sees a 500 and never sees the dead mad-lib template.
//
// Perspective (D1): we always compute synastry(selfChart, otherChart) so the
// caller is the "a" side → "你的星" = self, "对方的星" = other. Works for both
// A and B with the same route, just swapped charts.

const REL_TYPES: RelType[] = ["lover", "partner", "colleague", "friend", "family"];
const ZH: Record<string, string> = { Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星" };
// ru planet names for cross-aspect rendering (mirrors ZH; aligned with the shared glossary).
const RU_PLANET: Record<string, string> = { Sun: "Солнце", Moon: "Луна", Mercury: "Меркурий", Venus: "Венера", Mars: "Марс", Jupiter: "Юпитер", Saturn: "Сатурн" };
const strip = (label: string) => label.replace(/^[^一-龥]+/, "");

function chartSig(c: Chart): string {
  return c.ascSign + "|" + c.placements.map((p) => `${p.body}${p.sign}${p.house}`).join(",");
}

const TYPE_LABEL: Record<RelType, string> = { lover: "恋人", partner: "事业合伙", colleague: "共事", friend: "朋友", family: "家人" };
const TYPE_LABEL_RU: Record<RelType, string> = { lover: "влюблённые", partner: "деловые партнёры", colleague: "коллеги", friend: "друзья", family: "семья" };

function synPrompt(result: SynResult, selfFacts: string, otherFacts: string, otherName: string, locale: AppLocale): string {
  if (locale === "ru") {
    const dims = result.dims.map((d) => `${strip(d.label)}: ${d.value}`).join("; ");
    const aspects = result.dims
      .flatMap((d) =>
        d.aspects.map(
          (x) => `«${strip(d.label)}» твоя ${RU_PLANET[x.a] ?? x.a} ${x.angle}° — ${RU_PLANET[x.b] ?? x.b} (${otherName}) (${x.kind === "harmony" ? "гармония" : "напряжение"})`,
        ),
      )
      .join("\n");
    return `Это синастрия (совместимость) отношений типа «${TYPE_LABEL_RU[result.type]}».
Факты твоей натальной карты:
${selfFacts}

Факты натальной карты (${otherName}):
${otherFacts}

Баллы совместимости по измерениям: ${dims}

Реальные межкартовые аспекты (**используй ТОЛЬКО перечисленные ниже, не выдумывай другие аспекты**):
${aspects || "(нет значимых аспектов)"}

Пиши голосом Molly, во втором лице, обращаясь к «тебе», про эти отношения типа «${TYPE_LABEL_RU[result.type]}». Будь резкой, прямо называй настоящее напряжение, но без медицины и без абсолютов; в конце укажи на один деятельный поворот. Выводи только такой JSON, без какого-либо лишнего текста и без блоков кода:
{
  "vibe": "одна фраза о напряжении между самым сильным и самым слабым измерением (до ~22 символов)",
  "body": "две-три фразы, опираясь на реальные аспекты выше: что самое прочное, чего не хватает, чем это грозит (до ~80 символов)",
  "catchLine": "одна резкая фраза-цитата для скриншота, называет настоящее напряжение и указывает на действие (до ~32 символов)"
}${langDirective(locale)}`;
  }
  const dims = result.dims.map((d) => `${strip(d.label)}：${d.value}`).join("；");
  const aspects = result.dims
    .flatMap((d) => d.aspects.map((x) => `「${strip(d.label)}」你的${ZH[x.a] ?? x.a} ${x.angle}° ${otherName}的${ZH[x.b] ?? x.b}（${x.kind === "harmony" ? "和谐" : "张力"}）`))
    .join("\n");
  return `这是一段「${TYPE_LABEL[result.type]}」关系的合盘。
你的星盘事实：
${selfFacts}

${otherName}的星盘事实：
${otherFacts}

各维度契合分：${dims}

真实跨盘相位（**只能用下面这些，不许编造别的相位**）：
${aspects || "（无显著相位）"}

以 Molly 的口吻，第二人称写给「你」，针对这段「${TYPE_LABEL[result.type]}」关系。狠一点、直接命名真实张力，但不医疗不绝对，结尾点到一个能动的转身。只输出如下 JSON，不要任何额外文字或代码块标记：
{
  "vibe": "一句话点出最强维度与最弱维度的张力（≤22字）",
  "body": "两到三句，落到上面的真实相位：最稳的是什么、最缺的是什么、缺了会怎样（≤80字）",
  "catchLine": "一句能截图的狠话金句，命名真实张力且点到能动（≤32字）"
}`;
}

function parseSyn(text: string): SynRead {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const j = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
  if (typeof j.vibe !== "string" || typeof j.body !== "string" || typeof j.catchLine !== "string") {
    throw new Error("bad AI shape");
  }
  return { vibe: String(j.vibe), body: String(j.body), catchLine: String(j.catchLine) };
}

export async function POST(req: Request) {
  let body: { selfChart?: Chart; otherChart?: Chart; type?: string; selfName?: string; otherName?: string; gender?: Gender; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { selfChart, otherChart, type, otherName, gender } = body;
  // locale 从 POST body 取（proxy 不注入到 API），hasLocale 校验，非法回退默认。
  const locale: AppLocale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  if (!isFullChart(selfChart) || !isFullChart(otherChart)) return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  if (!type || !REL_TYPES.includes(type as RelType)) return NextResponse.json({ error: "bad type" }, { status: 400 });

  const relType = type as RelType;
  const result = synastry(selfChart, otherChart, relType);
  const scaffold = synScaffold(result, body.selfName, otherName);

  const cacheKey = `syn:${relType}:${chartSig(selfChart)}:${chartSig(otherChart)}`;
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) return NextResponse.json(cached); // cache hits never consume quota

  // Rate limit only the paid AI path; when over, serve the deterministic scaffold.
  const rl = await rateLimit(await resolveIdentity(req), RULES.reading());
  if (!rl.ok) return NextResponse.json({ ...scaffold, limited: true });

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  const system = `${personaFor(gender, locale)}\n\n${safetyFor(locale)}`;
  void pronoun(gender); // persona already gender-aware; pronoun kept available for future copy
  try {
    const r = await runLLM(synPrompt(result, facts(selfChart!, locale), facts(otherChart!, locale), otherName ?? "对方", locale), system, ac, 1024, locale);
    if (r.usage) await logUsage({ route: "synastry", ...r.usage }).catch(() => {});
    const ai = parseSyn(r.text);
    await cacheSet(cacheKey, ai).catch(() => {});
    return NextResponse.json(ai);
  } catch {
    // never a 500 to the user; not cached so a later success can still populate.
    return NextResponse.json({ ...scaffold, fallback: true });
  }
}
