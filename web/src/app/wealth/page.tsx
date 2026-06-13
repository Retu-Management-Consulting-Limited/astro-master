"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { monthWealth, type DayWealth } from "@/lib/astro/wealth";

const TODAY = 13;
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
  const chart = useFunnel((s) => s.chart);
  useEffect(() => { if (!chart) router.replace("/input"); }, [chart, router]);
  const m = useMemo(() => (chart ? monthWealth(chart, 2026, 6) : null), [chart]);
  if (!chart || !m) return null;

  const today = m.days.find((d) => d.day === TODAY)!;
  const wangToday = today.level === "wang";

  return (
    <main className="phone" data-testid="wealth">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <span onClick={() => router.back()} style={{ fontSize: 20, color: "var(--mute)", cursor: "pointer" }}>←</span>
        <div className="eye-mini" style={{ width: 30, height: 30 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "6px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "10px 2px 4px" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 25, color: "var(--cream)", fontWeight: 600 }}>💰 财运日历</h2>
          <span style={{ fontSize: 13, color: "var(--mute)" }}>2026 · 6月</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(127,201,154,.09)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 11, padding: "8px 12px", margin: "12px 0 16px", fontSize: 12.5, color: "var(--green)" }}>
          ✨ 本月搞钱黄金日：<b style={{ color: "#ade3c2" }}>{m.goldenDays.map((g) => `6/${g}`).join(" · ")}</b> —— 到点我提醒你
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 7 }}>
          {["一", "二", "三", "四", "五", "六", "日"].map((w) => <span key={w} style={{ textAlign: "center", fontSize: 10, color: "#5a6173" }}>{w}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: (new Date(Date.UTC(2026, 5, 1)).getUTCDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
          {m.days.map((d) => {
            const c = color(d);
            const gold = m.goldenDays.includes(d.day);
            const isToday = d.day === TODAY;
            return (
              <div key={d.day} data-testid="wealth-day" style={{ aspectRatio: "1", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 500, position: "relative", background: c.bg, color: c.fg, boxShadow: isToday ? "0 0 0 2px var(--gold),0 0 12px rgba(201,168,97,.5)" : gold ? "inset 0 0 0 1.5px #f5e3b0" : "none" }}>
                {isToday ? "今" : d.day}
                {gold && <span style={{ position: "absolute", top: 1, right: 3, fontSize: 8, color: "#fff" }}>✦</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "16px 0 6px", fontSize: 10.5, color: "var(--mute)" }}>
          慎 <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#c9302c,#e8a4a1,#eef1f4,#88c9a1,#1a7a3a)" }} /> 旺
        </div>

        {wangToday ? (
          <div style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #3fa860", border: "1px solid rgba(63,168,96,.3)", background: "linear-gradient(180deg,rgba(63,168,96,.1),rgba(63,168,96,.03))" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#7fd99a" }}>今天 · {TODAY} 号 · 财运旺 🟢</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}>木星照你的二宫——<b style={{ color: "var(--cream)" }}>今天你开口要钱赢面最大</b>。该谈的薪、该收的款今天去推；<span style={{ color: "#a8e0bf" }}>今天投资的胜率也偏高</span>。</div>
            <div style={{ fontSize: 10.5, color: "#5f6675", marginTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 8 }}>旺的是时机，不是保证——功课别省，决定你来做。</div>
          </div>
        ) : (
          <div style={{ marginTop: 14, borderRadius: 16, padding: "15px 16px", borderLeft: "3px solid #d44a46", border: "1px solid rgba(212,74,70,.28)", background: "linear-gradient(180deg,rgba(212,74,70,.08),rgba(212,74,70,.02))" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#e8736f" }}>今天 · {TODAY} 号 · 慎 🔴</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--cream-dim)" }}><b style={{ color: "var(--cream)" }}>不适合任何投资和大额消费决定。</b>今天你容易为情绪买单——想下单的，先睡一觉。</div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "#566073", margin: "18px 0 4px" }}>财运仅供参考 · 投资有风险，最终决定还是你做</div>
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--gold-soft)" }}>📤 晒我的搞钱黄金日</div>
      </div>
    </main>
  );
}
