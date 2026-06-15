"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChartGuard } from "@/lib/guard";
import { monthWealth, wealthMark, type DayWealth } from "@/lib/astro/wealth";
import { useNow } from "@/lib/useNow";
import { BackButton } from "@/components/BackButton";
const RETRO_ZH: Record<string, string> = { Mercury: "水逆", Venus: "金逆" };
function retroText(retro: DayWealth["retro"]): string {
  return retro.map((b) => RETRO_ZH[b] ?? b).join("·");
}
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

export default function WealthPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const now = useNow(); // local time, refreshes on app resume (rolls over days)
  const [selDay, setSelDay] = useState<number | null>(null); // P2-3: tap a day to read it
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
        <BackButton />
        <div className="eye-mini" style={{ width: 30, height: 30 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "6px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "10px 2px 4px" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 25, color: "var(--cream)", fontWeight: 600 }}>💰 财运日历</h1>
          <span style={{ fontSize: 13, color: "var(--mute)" }}>{year} · {month}月</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(127,201,154,.09)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 11, padding: "8px 12px", margin: "12px 0 16px", fontSize: 12.5, color: "var(--green)" }}>
          ✨ 本月搞钱黄金日：<b style={{ color: "#ade3c2" }}>{m.goldenDays.map((g) => `${month}/${g}`).join(" · ")}</b> —— 别错过这几天
        </div>

        {m.events.length > 0 && (
          <div data-testid="wealth-events" style={{ margin: "-4px 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--mute)", letterSpacing: ".05em" }}>本月大事件</span>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 7 }}>
          {["一", "二", "三", "四", "五", "六", "日"].map((w) => <span key={w} style={{ textAlign: "center", fontSize: 10, color: "#5a6173" }}>{w}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
          {m.days.map((d) => {
            const c = color(d);
            const mark = wealthMark(d.level);
            const gold = m.goldenDays.includes(d.day);
            const isToday = d.day === TODAY;
            const isSel = d.day === sel;
            return (
              <button type="button" key={d.day} data-testid="wealth-day" onClick={() => setSelDay(d.day)} aria-pressed={isSel}
                aria-label={`${month}月${d.day}日 · ${mark.label}${gold ? " · 搞钱黄金日" : ""}${d.retro.length ? ` · ${retroText(d.retro)}，缓签约大额` : ""}${isToday ? " · 今天" : ""}`}
                style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, fontSize: 12.5, fontWeight: 500, position: "relative", padding: 0, cursor: "pointer", background: c.bg, color: c.fg, boxShadow: isToday ? "0 0 0 2px var(--gold),0 0 12px rgba(201,168,97,.5)" : gold ? "inset 0 0 0 1.5px #f5e3b0" : "none", outline: isSel && !isToday ? "2px solid var(--cream)" : "none", outlineOffset: isSel && !isToday ? 1 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{isToday ? "今" : d.day}</span>
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
          <span style={{ fontSize: 8 }} aria-hidden="true">▼</span> 慎 <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#c9302c,#e8a4a1,#eef1f4,#88c9a1,#1a7a3a)" }} /> 旺 <span style={{ fontSize: 8 }} aria-hidden="true">▲</span>
        </div>

        {(() => {
          const when = isTodaySel ? `今天 · ${selData.day} 号` : `${month}月${selData.day}日`;
          if (selData.level === "wang") return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #3fa860", border: "1px solid rgba(63,168,96,.3)", background: "linear-gradient(180deg,rgba(63,168,96,.1),rgba(63,168,96,.03))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#7fd99a" }}>{when} · 财运旺 🟢</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}>财气在你这边——<b style={{ color: "var(--cream)" }}>{isTodaySel ? "今天" : "这天"}你开口要钱赢面最大</b>。该谈的薪、该收的款挑这天去推；<span style={{ color: "#a8e0bf" }}>投资的胜率也偏高</span>。</div>
              <div style={{ fontSize: 10.5, color: "#5f6675", marginTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 8 }}>旺的是时机，不是保证——功课别省，决定你来做。</div>
            </div>
          );
          if (selData.level === "shen") return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #d44a46", border: "1px solid rgba(212,74,70,.28)", background: "linear-gradient(180deg,rgba(212,74,70,.08),rgba(212,74,70,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#e8736f" }}>{when} · 慎 🔴</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>不适合大额投资和消费决定。</b>{isTodaySel ? "今天" : "这天"}你容易为情绪买单——想下单的，先睡一觉。</div>
            </div>
          );
          return (
            <div data-testid="wealth-detail" style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #6b7384", border: "1px solid rgba(217,222,231,.18)", background: "linear-gradient(180deg,rgba(217,222,231,.06),rgba(217,222,231,.02))" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#aab2c0" }}>{when} · 平 ⚪</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}>财运平稳——没有特别的顺风，也没坑。按计划走就好，<b style={{ color: "var(--cream)" }}>不必勉强出手</b>。</div>
            </div>
          );
        })()}

        {selData.driver && (
          <div data-testid="wealth-driver" style={{ marginTop: 10, fontSize: 12.5, color: "var(--mute)", display: "flex", alignItems: "center", gap: 7 }}>
            <span aria-hidden="true" style={{ color: valColor(selData.driver.valence), fontSize: 14 }}>{PLANET_GLYPH[selData.driver.planet]}</span>
            <span>今日主导：<b style={{ color: "var(--cream-dim)" }}>{selData.driver.name}</b></span>
          </div>
        )}

        {selData.retro.length > 0 && (
          <div data-testid="wealth-retro" style={{ marginTop: 10, borderRadius: 12, padding: "11px 13px", borderLeft: "3px solid #d9a441", border: "1px solid rgba(217,164,65,.3)", background: "linear-gradient(180deg,rgba(217,164,65,.1),rgba(217,164,65,.03))" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: "#e6bd6a" }}>☿ {retroText(selData.retro)}中</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--cream-dim)" }}>{selData.retro.includes("Venus") ? "金钱与关系都容易反复——" : "沟通、合约、付款容易反复——"}<b style={{ color: "var(--cream)" }}>重要签约、大额消费先缓一缓</b>，能等就等过这阵；旧账复盘、退款、谈回头单反而合适。</div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "#566073", margin: "18px 0 4px" }}>财运仅供参考 · 投资有风险，最终决定还是你做</div>
        <button type="button" onClick={() => router.push("/share")} style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>📤 晒我的搞钱黄金日</button>
      </div>
    </main>
  );
}
