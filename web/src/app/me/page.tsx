"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { TabBar } from "@/components/TabBar";

export default function MePage() {
  const router = useRouter();
  const chart = useFunnel((s) => s.chart);
  const nickname = useFunnel((s) => s.nickname);
  useEffect(() => { if (!chart) router.replace("/input"); }, [chart, router]);
  if (!chart) return null;

  const rows = [
    { ic: "🕰️", t: "历史回看", badge: "一年前的今天" },
    { ic: "📤", t: "我的卡片", arr: "12 ›", href: "/share" },
    { ic: "💞", t: "合盘", arr: "›", href: "/synastry" },
    { ic: "⚙️", t: "设置", arr: "›" },
  ];

  return (
    <main className="phone" data-testid="me">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "24px 22px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div className="eye-mini" style={{ width: 60, height: 60 }} />
          <div>
            <div style={{ fontSize: 18, color: "var(--cream)", fontWeight: 600 }}>{nickname ?? "你"}</div>
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 3 }}>认识 38 天 · ♅ 上升{chart.ascSign}</div>
          </div>
        </div>

        <div style={{ background: "linear-gradient(180deg, rgba(201,168,97,.08), rgba(201,168,97,.02))", border: "1px solid rgba(201,168,97,.32)", borderRadius: 18, padding: 16, marginBottom: 18, boxShadow: "0 0 30px -14px rgba(201,168,97,.4)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>🫀 我眼中的你</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, color: "var(--gold-soft)", lineHeight: 1.45, marginBottom: 10 }}>&ldquo;一个把所有人都照顾好了，唯独忘了自己的人。&rdquo;</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--cream-dim)" }}>
            懂你 <span style={{ flex: 1, maxWidth: 120, height: 5, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: "62%", background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> 62% ↑ <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: 12 }}>看完整 →</span>
          </div>
        </div>

        <div>
          {rows.map((r) => (
            <div key={r.t} data-testid={r.href ? `row-${r.href.slice(1)}` : undefined} onClick={() => r.href && router.push(r.href)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", borderBottom: "1px solid rgba(255,255,255,.05)", fontSize: 15, color: "var(--cream-dim)", cursor: r.href ? "pointer" : "default" }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{r.ic}</span>{r.t}
              {r.badge ? <span style={{ marginLeft: "auto", background: "#1f2a44", color: "#9ecbff", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>{r.badge}</span> : <span style={{ marginLeft: "auto", color: "#4f5666" }}>{r.arr}</span>}
            </div>
          ))}
        </div>
      </div>
      <TabBar active="me" />
    </main>
  );
}
