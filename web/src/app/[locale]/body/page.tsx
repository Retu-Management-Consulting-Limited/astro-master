"use client";
import { Suspense, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useChartGuard } from "@/lib/guard";
import { monthBody, bodyMark, moonPhaseMark, type DayBody } from "@/lib/astro/body";
import { bodyVerdict } from "@/lib/reading/bodyVerdict";
import { useNow } from "@/lib/useNow";
import { TabBar } from "@/components/TabBar";

// ── 身心日历 /body · T4 Phase 4 ─────────────────────────────────────────────
// 与财运日历 /wealth **同构**（UI 真相源 design/23 第二屏「点身心 chip 进去 = 身心
// 日历，和财运日历同构」）：同一张月历骨架，只是内容从「钱」换成「身心」。结构逐
// 段对齐 app/wealth/page.tsx——Suspense + useChartGuard + useNow + monthBody memo →
// 7 列网格 → 选日 detail 三态 → 看更深。
//
// **同一套行动灯**：身心格复用与财运同一套红/绿/平（low→red 该歇·留意、good→green
// 有劲、calm→plain 平稳），不另起一套配色。teal 只是标题/chip 的点缀色，不是 state 灯。
// 月相标记（🌑新月 / 🌕满月）按行运月亮 vs 太阳的角距标在格子上（design/23：新月/满月
// 情绪最满）。
//
// state 的色板与 /wealth 的 color() 同源（同一组 red/green/plain 语义），只是身心轨
// 三态命名为 low/good/calm。
// 与 /wealth 同一套红/绿/平行动灯——身心轨不另起配色（design/23）。三档都取 wealth
// 的最深档：RED=wealth shen 最深 #c9302c、GREEN=wealth wang 最深 #1a7a3a、PLAIN=wealth
// ping #d9dee7（见 app/wealth/page.tsx color()）。
const RED = { bg: "#c9302c", fg: "#fff" };       // 该歇/留意 = 红（= wealth shen 最深 #c9302c）
const GREEN = { bg: "#1a7a3a", fg: "#eafff1" };  // 有劲 = 绿（= wealth wang 最深 #1a7a3a）
const PLAIN = { bg: "#d9dee7", fg: "#39414c" };  // 平稳 = 平（= wealth ping #d9dee7）
function cellColor(level: DayBody["level"]): { bg: string; fg: string } {
  if (level === "good") return GREEN;
  if (level === "low") return RED;
  return PLAIN;
}
// 格子 aria-label 的态文案——稍长于 bodyMark.label（包含「留意」），走 t("levelLabel.<level>")。

// useSearchParams() opts the subtree out of static prerender → 必须包在 Suspense 下
// （Next app-router 要求，同 /wealth）。
export default function BodyPage() {
  return (
    <Suspense fallback={null}>
      <BodyView />
    </Suspense>
  );
}

function BodyView() {
  const t = useTranslations("body");
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const now = useNow(); // 本地时间，app resume 时刷新（跨天滚动）
  // ?selDay=N — 从身心 chip 深链落到这天预选（对称于 /wealth 的 selDay）。
  const sp = useSearchParams();
  const spDay = (() => {
    const raw = sp.get("selDay");
    const n = raw ? Number(raw) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
  })();
  const [selDay, setSelDay] = useState<number | null>(spDay);

  const year = now?.getFullYear() ?? 2026;
  const month = (now?.getMonth() ?? 5) + 1; // 1-based
  const TODAY = now?.getDate() ?? 1;
  const m = useMemo(() => (chart && now ? monthBody(chart, year, month) : null), [chart, now, year, month]);
  if (!ready || !chart || !now || !m) return null;

  const sel = selDay ?? TODAY;
  const selData = m.days.find((d) => d.day === sel) ?? m.days.find((d) => d.day === TODAY)!;
  const isTodaySel = selData.day === TODAY;
  // 选中日的完整身心判词（同一引擎 bodyVerdict，不分叉）——给 detail 卡的安抚/permission 文案。
  const selDate = new Date(Date.UTC(year, month - 1, selData.day, 12, 0));
  const bv = bodyVerdict(chart, selDate);

  // 下一个该顾一下自己的日子（今天之后最近的 low 日）——design/23 detail 卡台词。
  const nextLow = m.days.find((d) => d.day > TODAY && d.level === "low");

  return (
    <main className="phone" data-testid="body">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <div className="eye-mini" style={{ width: 30, height: 30 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "6px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "10px 2px 4px" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 25, color: "var(--teal-soft)", fontWeight: 600 }}>{t("title")}</h1>
          <span style={{ fontSize: 13, color: "var(--mute)" }}>{t("monthLabel", { year, month })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(111,194,192,.09)", border: "1px solid rgba(111,194,192,.28)", borderRadius: 11, padding: "8px 12px", margin: "12px 0 16px", fontSize: 12.5, color: "var(--teal)" }}>
          {t("bannerBefore")}<b style={{ color: "var(--teal-soft)" }}>{t("bannerEmphasis")}</b>{t("bannerAfter")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 7 }}>
          {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((w) => <span key={w} style={{ textAlign: "center", fontSize: 10, color: "#5a6173" }}>{t(`weekdays.${w}`)}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {Array.from({ length: (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
          {m.days.map((d) => {
            const c = cellColor(d.level);
            const mark = bodyMark(d.level);
            const isToday = d.day === TODAY;
            const isSel = d.day === sel;
            const phase = moonPhaseMark(new Date(Date.UTC(year, month - 1, d.day, 12, 0)));
            return (
              <button type="button" key={d.day} data-testid="body-day" onClick={() => setSelDay(d.day)} aria-pressed={isSel}
                aria-label={`${t("dayAriaBase", { month, day: d.day, level: t(`levelLabel.${d.level}`) })}${phase === "🌑" ? t("dayAriaNew") : phase === "🌕" ? t("dayAriaFull") : ""}${isToday ? t("dayAriaToday") : ""}`}
                style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, fontSize: 12.5, fontWeight: 500, position: "relative", padding: 0, cursor: "pointer", background: c.bg, color: c.fg, boxShadow: isToday ? "0 0 0 2px var(--gold),0 0 12px rgba(201,168,97,.5)" : "none", outline: isSel && !isToday ? "2px solid var(--cream)" : "none", outlineOffset: isSel && !isToday ? 1 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{isToday ? t("todayCellLabel") : d.day}</span>
                <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, opacity: 1 }}>{mark.glyph}</span>
                {phase && <span aria-hidden="true" style={{ position: "absolute", top: 1, right: 3, fontSize: 9, opacity: 0.9 }}>{phase}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "16px 0 6px", fontSize: 10.5, color: "var(--mute)" }}>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: GREEN.bg, marginRight: 4, verticalAlign: "middle" }} aria-hidden="true" />{t("legendGood")}</span>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: RED.bg, marginRight: 4, verticalAlign: "middle" }} aria-hidden="true" />{t("legendLow")}</span>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: PLAIN.bg, marginRight: 4, verticalAlign: "middle" }} aria-hidden="true" />{t("legendCalm")}</span>
        </div>

        {(() => {
          const when = isTodaySel ? t("whenToday", { day: selData.day }) : t("whenDate", { month, day: selData.day });
          if (selData.level === "low") return (
            <div data-testid="body-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #d44a46", border: "1px solid rgba(212,74,70,.28)", background: "linear-gradient(180deg,rgba(212,74,70,.08),rgba(212,74,70,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#e8736f" }}>{t("lowHeader", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>{bv.line}</b> {bv.why}</div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "var(--cream-dim)", marginTop: 8 }}>{bv.care}</div>
            </div>
          );
          if (selData.level === "good") return (
            <div data-testid="body-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #3fa860", border: "1px solid rgba(63,168,96,.3)", background: "linear-gradient(180deg,rgba(63,168,96,.1),rgba(63,168,96,.03))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#7fd99a" }}>{t("goodHeader", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>{bv.line}</b> {bv.why}</div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "var(--cream-dim)", marginTop: 8 }}>{bv.care}</div>
            </div>
          );
          return (
            <div data-testid="body-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #6b7384", border: "1px solid rgba(217,222,231,.18)", background: "linear-gradient(180deg,rgba(217,222,231,.06),rgba(217,222,231,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#aab2c0" }}>{t("calmHeader", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>{bv.line}</b> {bv.why}{nextLow ? <>{t("nextLowBefore")}<b style={{ color: "var(--teal-soft)" }}>{t("nextLowDay", { day: nextLow.day })}</b>{t("nextLowAfter")}</> : null}</div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "var(--cream-dim)", marginTop: 8 }}>{bv.care}</div>
            </div>
          );
        })()}

        {/* "看更深" — 日历告诉你 WHEN，身心深度告诉你能量周期 / 怎么照顾自己。对称于
            /wealth 的「钱对你意味着什么」看更深入口。落到对话深谈身心（/chat）。*/}
        <button type="button" data-testid="body-deeper" onClick={() => router.push("/chat")} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: 18, padding: "11px 13px", borderRadius: 12, background: "rgba(111,194,192,.07)", border: "1px solid rgba(111,194,192,.34)", fontSize: 13, color: "var(--teal-soft)", cursor: "pointer" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 8px var(--teal)" }} aria-hidden="true" /><span>{t("deeperBefore")}<b style={{ color: "var(--cream)" }}>{t("deeperEmphasis")}</b></span><span style={{ marginLeft: "auto", color: "var(--teal-soft)" }}>{t("deeperCta")}</span>
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "#566073", margin: "16px 0 4px" }}>{t("disclaimer")}</div>
      </div>

      {/* 身心降 chip 后，/body 不再有自己的 active tab——传不匹配任何 tab 的值，
          TabBar 仍渲染（满足 route-exit guard）但 0 高亮（对称于 /wealth）。*/}
      <TabBar active="body" />
    </main>
  );
}
