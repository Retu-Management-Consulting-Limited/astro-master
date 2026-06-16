"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useChartGuard } from "@/lib/guard";
import { detectHighlights } from "@/lib/astro/highlights";
import { highlightHeadline, highlightHook, highlightTheme } from "@/lib/reading/highlightCopy";
import { collectMoodHistory } from "@/lib/moodHistory";
import { lowStreak } from "@/lib/model/userModel";
import { TabBar } from "@/components/TabBar";
import { EntryCard } from "@/components/money/EntryCard";
import { useUnderstanding } from "@/lib/understanding";
import type { BodyName } from "@/lib/astro/chart";

const GLYPH: Record<BodyName, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

function pos(lon: number, r: number) {
  const a = (lon - 90) * (Math.PI / 180); // 0°Aries at top, clockwise-ish
  return { x: 160 + r * Math.cos(a), y: 160 + r * Math.sin(a) };
}

export default function ChartPage() {
  const { chart, ready } = useChartGuard();
  const understand = useUnderstanding();
  // keystone回喂: a recent low-mood streak lets the highlight acknowledge it (her own
  // check-ins; warm, lands on care — R18 ②⑥). Loaded client-side from localStorage.
  const [low, setLow] = useState(0);
  useEffect(() => {
    try { setLow(lowStreak(collectMoodHistory(localStorage))); } catch {}
  }, []);
  if (!ready || !chart) return null;

  const highlights = detectHighlights(chart);
  const glowBodies = new Set(highlights.flatMap((h) => h.bodies));
  // one card per life-area: dedupe by domain (headlines are domain-keyed, so two
  // same-domain hits would otherwise print the identical line twice).
  const seenDomain = new Set<string>();
  const topHighlights = highlights.filter((h) => (seenDomain.has(h.domain) ? false : (seenDomain.add(h.domain), true))).slice(0, 3);
  const sun = chart.placements.find((p) => p.body === "Sun")!;
  const moon = chart.placements.find((p) => p.body === "Moon")!;

  const themes = [
    { id: "love", ic: "💔", t: "感情与关系" },
    { id: "wealth", ic: "💰", t: "财富与时机" },
    { id: "lonely", ic: "🌧️", t: "孤独与归属" },
    { id: "self", ic: "🧭", t: "自我与方向" },
  ] as const;

  return (
    <main className="phone" data-testid="chart">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>本命盘</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 8px" }}>
        <div className="eye-mini" style={{ width: 32, height: 32 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>懂你 <b style={{ color: "var(--gold)" }}>{understand}%</b> ✨</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "0 20px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0 8px" }}>
          <svg width="290" height="290" viewBox="0 0 320 320">
            <defs>
              <radialGradient id="gg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#c9a861" stopOpacity=".85" /><stop offset="100%" stopColor="#c9a861" stopOpacity="0" /></radialGradient>
              <radialGradient id="gp" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#e69ec8" stopOpacity=".85" /><stop offset="100%" stopColor="#e69ec8" stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx="160" cy="160" r="142" fill="none" stroke="#c9a861" strokeWidth="1.4" />
            <circle cx="160" cy="160" r="132" fill="none" stroke="#c9a861" strokeWidth=".5" opacity=".55" />
            <circle cx="160" cy="160" r="62" fill="none" stroke="#c9a861" strokeWidth=".7" opacity=".7" />
            <rect x="100" y="100" width="120" height="120" fill="none" stroke="#c9a861" strokeWidth=".5" opacity=".22" transform="rotate(45 160 160)" />
            <g stroke="#c9a861" strokeWidth=".4" opacity=".24">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * 30) * (Math.PI / 180);
                return <line key={i} x1={160 + 28 * Math.cos(a)} y1={160 + 28 * Math.sin(a)} x2={160 + 142 * Math.cos(a)} y2={160 + 142 * Math.sin(a)} />;
              })}
            </g>
            {chart.placements.map((p) => {
              const { x, y } = pos(p.lon, 100);
              const glow = glowBodies.has(p.body);
              const isVenus = p.body === "Venus";
              if (!glow) return <circle key={p.body} cx={x} cy={y} r="3" fill="#586074" />;
              return (
                <g key={p.body}>
                  <circle cx={x} cy={y} r="18" fill={isVenus ? "url(#gp)" : "url(#gg)"} />
                  <circle cx={x} cy={y} r="5" fill={isVenus ? "#e69ec8" : "#e0c98a"} />
                  <text x={x} y={y + 3.5} fontSize="10" fill="#1a1305" textAnchor="middle" fontWeight="bold">{GLYPH[p.body]}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--cream-dim)", letterSpacing: ".04em" }}>↑ 上升<b style={{ color: "var(--gold)" }}>{chart.ascSign}</b> · ☉ {sun.sign} · ☽ {moon.sign}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--mute)" }}>亮的是你盘上<b style={{ color: "var(--gold)" }}>最强的几处</b> · 你越常来，我越懂你</div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--cream)", fontWeight: 500, lineHeight: 1.4 }}>你出生那一刻，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>天空替你写下了几件事。</i></div>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, lineHeight: 1.6 }}>不是我评判你，是这张盘本来的样子——我陪你一起读。</div>
        </div>
        {topHighlights.map((h, i) => {
          const pink = h.bodies.includes("Venus");
          const moodNote = i === 0 && low >= 2; // first card warmly acknowledges a recent low streak (keystone回喂)
          return (
            <Link key={i} href={`/theme/${highlightTheme(h.domain)}`} data-testid="highlight" style={{ display: "block", textDecoration: "none", background: "linear-gradient(180deg, rgba(201,168,97,.08), rgba(201,168,97,.02))", border: `1px solid ${pink ? "rgba(230,158,200,.3)" : "rgba(201,168,97,.3)"}`, borderRadius: 16, padding: "14px 15px", marginTop: 11, boxShadow: `0 0 26px -16px ${pink ? "rgba(230,158,200,.5)" : "rgba(201,168,97,.5)"}` }}>
              <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--cream)", fontWeight: 500 }}>{highlightHeadline(h.domain)}</div>
              <div style={{ fontSize: 11.5, color: pink ? "#f1c2dd" : "var(--gold-soft)", marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span aria-hidden="true">✦</span> {h.summary} · 你生来带的
                {moodNote && <span style={{ color: "var(--blue)" }}>· 也接住了你这几天的低落</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 9, display: "flex", alignItems: "center" }}>{highlightHook(h.domain)}<b style={{ marginLeft: "auto", color: pink ? "#e69ec8" : "var(--gold)", fontWeight: 500 }}>→</b></div>
            </Link>
          );
        })}

        <div style={{ marginTop: 20 }}>
          {themes.map((t) => (
            <Link key={t.id} href={`/theme/${t.id}`} data-testid="theme-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 4px", borderBottom: "1px solid rgba(255,255,255,.05)", fontSize: 14.5, color: "var(--cream)", textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>{t.ic}</span>{t.t}
              <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: 13 }}>深读 ›</span>
            </Link>
          ))}
        </div>
        <EntryCard surface="chart" />
        <Link href="/share" style={{ display: "block", margin: "20px 0 6px", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", textDecoration: "none" }}>📤 把我的星盘存成图</Link>
      </div>

      <TabBar active="chart" />
    </main>
  );
}
