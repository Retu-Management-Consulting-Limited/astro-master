"use client";
import { Suspense, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useChartGuard } from "@/lib/guard";
import { monthWealth, wealthMark, type DayWealth } from "@/lib/astro/wealth";
import { useNow } from "@/lib/useNow";
import { TabBar } from "@/components/TabBar";
const PLANET_GLYPH: Record<string, string> = { Jupiter: "♃", Venus: "♀", Sun: "☉", Mars: "♂", Saturn: "♄", Mercury: "☿" };
function valColor(v: number): string { return v > 0 ? "#7fd99a" : v < 0 ? "#e8736f" : "#aab2c0"; }
function color(d: DayWealth): { bg: string; fg: string } {
  if (d.level === "wang") {
    if (d.intensity >= 85) return { bg: "#1a7a3a", fg: "#eafff1" };
    if (d.intensity >= 74) return { bg: "#3fa860", fg: "#06210f" };
    return { bg: "#88c9a1", fg: "#06210f" };
  }
  if (d.level === "shen") {
    if (d.intensity <= 30) return { bg: "#c9302c", fg: "#fff" };
    if (d.intensity <= 38) return { bg: "#d44a46", fg: "#fff" };
    return { bg: "#e0908d", fg: "#3a1010" };
  }
  return { bg: "#d9dee7", fg: "#39414c" };
}

// useSearchParams() opts the subtree out of static prerender, so it must sit
// under a Suspense boundary (Next app-router requirement).
export default function WealthPage() {
  return (
    <Suspense fallback={null}>
      <WealthView />
    </Suspense>
  );
}

function WealthView() {
  const t = useTranslations("wealth");
  const retroText = (retro: DayWealth["retro"]): string =>
    retro.map((b) => (b === "Mercury" || b === "Venus" ? t(`retro.${b}`) : b)).join("·");
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const now = useNow(); // local time, refreshes on app resume (rolls over days)
  // ?selDay=N — deep-link from the 今日格 red-day door / fortune chip lands here
  // pre-selected on that day. Falls back to today (selDay stays null) when absent.
  const sp = useSearchParams();
  const spDay = (() => {
    const raw = sp.get("selDay");
    const n = raw ? Number(raw) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
  })();
  const [selDay, setSelDay] = useState<number | null>(spDay); // P2-3: tap a day to read it
  const year = now?.getFullYear() ?? 2026;
  const month = (now?.getMonth() ?? 5) + 1; // 1-based
  const TODAY = now?.getDate() ?? 1;
  const m = useMemo(() => (chart && now ? monthWealth(chart, year, month) : null), [chart, now, year, month]);
  if (!ready || !chart || !now || !m) return null;

  const sel = selDay ?? TODAY;
  const selData = m.days.find((d) => d.day === sel) ?? m.days.find((d) => d.day === TODAY)!;
  const isTodaySel = selData.day === TODAY;

  return (
    <main className="phone" data-testid="wealth">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <div className="eye-mini" style={{ width: 30, height: 30 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "6px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "10px 2px 4px" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 25, color: "var(--cream)", fontWeight: 600 }}>{t("title")}</h1>
          <span style={{ fontSize: 13, color: "var(--mute)" }}>{t("monthLabel", { year, month })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(127,201,154,.09)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 11, padding: "8px 12px", margin: "12px 0 16px", fontSize: 12.5, color: "var(--green)" }}>
          {t("goldenBefore")}<b style={{ color: "#ade3c2" }}>{m.goldenDays.map((g) => `${month}/${g}`).join(" · ")}</b>{t("goldenAfter")}
        </div>

        {m.events.length > 0 && (
          <div data-testid="wealth-events" style={{ margin: "-4px 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--mute)", letterSpacing: ".05em" }}>{t("eventsHeading")}</span>
            {m.events.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--cream-dim)" }}>
                <span aria-hidden="true" style={{ color: valColor(w.valence), fontSize: 14 }}>{PLANET_GLYPH[w.planet]}</span>
                <b style={{ color: "var(--cream)" }}>{month}/{w.startDay}{w.endDay > w.startDay ? `–${w.endDay}` : ""}</b>
                <span>{w.name}</span>
                <span aria-hidden="true">{w.valence > 0 ? "🟢" : w.valence < 0 ? "🔴" : "⚪"}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 7 }}>
          {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((w) => <span key={w} style={{ textAlign: "center", fontSize: 10, color: "#5a6173" }}>{t(`weekdays.${w}`)}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {Array.from({ length: (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
          {m.days.map((d) => {
            const c = color(d);
            const mark = wealthMark(d.level);
            const gold = m.goldenDays.includes(d.day);
            const isToday = d.day === TODAY;
            const isSel = d.day === sel;
            return (
              <button type="button" key={d.day} data-testid="wealth-day" onClick={() => setSelDay(d.day)} aria-pressed={isSel}
                aria-label={`${t("dayAriaBase", { month, day: d.day, mark: mark.label })}${gold ? t("dayAriaGolden") : ""}${d.retro.length ? t("dayAriaRetro", { retro: retroText(d.retro) }) : ""}${isToday ? t("dayAriaToday") : ""}`}
                style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, fontSize: 12.5, fontWeight: 500, position: "relative", padding: 0, cursor: "pointer", background: c.bg, color: c.fg, boxShadow: isToday ? "0 0 0 2px var(--gold),0 0 12px rgba(201,168,97,.5)" : gold ? "inset 0 0 0 1.5px #f5e3b0" : "none", outline: isSel && !isToday ? "2px solid var(--cream)" : "none", outlineOffset: isSel && !isToday ? 1 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{isToday ? t("todayCellLabel") : d.day}</span>
                <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 700, marginTop: 0, lineHeight: 1, opacity: 1 }}>{mark.glyph}</span>
                {gold && <span aria-hidden="true" style={{ position: "absolute", top: 1, right: 3, fontSize: 13, color: "#fff", textShadow: "0 0 3px rgba(0,0,0,.5)" }}>✦</span>}
                {d.retro.length > 0 && (
                  <span aria-hidden="true" style={{ position: "absolute", top: 0, left: 2, display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 18, fontWeight: 800, letterSpacing: -1, lineHeight: 1, color: "#ff3b30", textShadow: "0 0 2px #fff, 0 0 4px rgba(0,0,0,.5)" }}>
                    {d.retro.map((b) => PLANET_GLYPH[b]).join("")}<span style={{ fontStyle: "italic" }}>℞</span>
                  </span>
                )}
                {m.events.some((w) => d.day >= w.startDay && d.day <= w.endDay) && (() => {
                  const v = m.events.find((w) => d.day >= w.startDay && d.day <= w.endDay)!.valence;
                  return <span aria-hidden="true" style={{ position: "absolute", bottom: 2, left: 3, right: 3, height: 6, borderRadius: 3,
                    background: v > 0 ? "#27d36e" : v < 0 ? "#ff5147" : "#9aa3b2", boxShadow: "0 0 4px " + (v > 0 ? "rgba(39,211,110,.6)" : v < 0 ? "rgba(255,81,71,.6)" : "rgba(0,0,0,.2)") }} />;
                })()}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "16px 0 6px", fontSize: 10.5, color: "var(--mute)" }}>
          <span style={{ fontSize: 8 }} aria-hidden="true">▼</span> {t("legendCaution")} <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#c9302c,#e8a4a1,#eef1f4,#88c9a1,#1a7a3a)" }} /> {t("legendProsper")} <span style={{ fontSize: 8 }} aria-hidden="true">▲</span>
        </div>

        {(() => {
          const when = isTodaySel ? t("whenToday", { day: selData.day }) : t("whenDate", { month, day: selData.day });
          if (selData.level === "wang") return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #3fa860", border: "1px solid rgba(63,168,96,.3)", background: "linear-gradient(180deg,rgba(63,168,96,.1),rgba(63,168,96,.03))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#7fd99a" }}>{t("wang.header", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}>{t("wang.bodyBefore")}<b style={{ color: "var(--cream)" }}>{isTodaySel ? t("wang.bodyEmphasisToday") : t("wang.bodyEmphasisOther")}</b>{t("wang.bodyMid")}<span style={{ color: "#a8e0bf" }}>{t("wang.bodyInvest")}</span>{t("wang.bodyEnd")}</div>
              <div style={{ fontSize: 10.5, color: "#5f6675", marginTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 8 }}>{t("wang.footnote")}</div>
            </div>
          );
          if (selData.level === "shen") return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #d44a46", border: "1px solid rgba(212,74,70,.28)", background: "linear-gradient(180deg,rgba(212,74,70,.08),rgba(212,74,70,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#e8736f" }}>{t("shen.header", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>{t("shen.bodyEmphasis")}</b>{isTodaySel ? t("shen.bodyToday") : t("shen.bodyOther")}</div>
            </div>
          );
          return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #6b7384", border: "1px solid rgba(217,222,231,.18)", background: "linear-gradient(180deg,rgba(217,222,231,.06),rgba(217,222,231,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#aab2c0" }}>{t("ping.header", { when })}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}>{t("ping.bodyBefore")}<b style={{ color: "var(--cream)" }}>{t("ping.bodyEmphasis")}</b>{t("ping.bodyEnd")}</div>
            </div>
          );
        })()}

        {selData.driver && (
          <div data-testid="wealth-driver" style={{ marginTop: 10, fontSize: 12.5, color: "var(--mute)", display: "flex", alignItems: "center", gap: 7 }}>
            <span aria-hidden="true" style={{ color: valColor(selData.driver.valence), fontSize: 14 }}>{PLANET_GLYPH[selData.driver.planet]}</span>
            <span>{t("driverLabel")}<b style={{ color: "var(--cream-dim)" }}>{selData.driver.name}</b></span>
          </div>
        )}

        {selData.retro.length > 0 && (
          <div data-testid="wealth-retro" style={{ marginTop: 10, borderRadius: 12, padding: "11px 13px", borderLeft: "3px solid #d9a441", border: "1px solid rgba(217,164,65,.3)", background: "linear-gradient(180deg,rgba(217,164,65,.1),rgba(217,164,65,.03))" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: "#e6bd6a" }}>{t("retroHeader", { retro: retroText(selData.retro) })}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--cream-dim)" }}>{selData.retro.includes("Venus") ? t("retroVenus") : t("retroOther")}<b style={{ color: "var(--cream)" }}>{t("retroEmphasis")}</b>{t("retroEnd")}</div>
          </div>
        )}

        {/* "看更深" — the calendar tells you WHEN; the money mirror tells you what
            money MEANS to you. Hand off to the existing reveal→story funnel. */}
        <button type="button" data-testid="wealth-deeper" onClick={() => router.push("/money")} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: 18, padding: "11px 13px", borderRadius: 12, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.34)", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} aria-hidden="true" /><span>{t("deeperBefore")}<b style={{ color: "var(--cream)" }}>{t("deeperEmphasis")}</b></span><span style={{ marginLeft: "auto", color: "var(--gold-soft)" }}>{t("deeperCta")}</span>
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "#566073", margin: "16px 0 4px" }}>{t("disclaimer")}</div>
        <button type="button" onClick={() => router.push("/share")} style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>{t("shareCta")}</button>
      </div>

      {/* 财运降 chip 后，/wealth 不再有自己的 active tab——传不匹配任何 tab 的值，
          TabBar 仍渲染（满足 route-exit guard）但 0 高亮（见 TabBar.test）。*/}
      <TabBar active="wealth" />
    </main>
  );
}
