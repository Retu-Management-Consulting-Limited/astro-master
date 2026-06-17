"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { generateThemeRead, THEME_IDS, type ThemeId, type ThemeRead } from "@/lib/reading/theme";
import { fetchThemeRead, AI_ON } from "@/lib/reading/remote";
import { memoryPreface } from "@/lib/reading/themeMemory";
import { deepUnlock, DEEP_UNLOCK_AT } from "@/lib/reading/deepUnlock";
import { collectMoodHistory } from "@/lib/moodHistory";
import { moodTrend, lowStreak, type MoodTrend } from "@/lib/model/userModel";
import { useUnderstanding } from "@/lib/understanding";
import { MollyThinking } from "@/components/MollyThinking";
import { BackButton } from "@/components/BackButton";
import { track } from "@/lib/track";

export default function ThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const themeId = (THEME_IDS as string[]).includes(id) ? (id as ThemeId) : null;
  const [r, setR] = useState<ThemeRead | null>(null);
  const [refining, setRefining] = useState(false);
  const [showPaidNote, setShowPaidNote] = useState(false);
  // keystone回喂 + honest gate read live state. Mood from the user's own check-ins.
  const understand = useUnderstanding();
  const [mood, setMood] = useState<{ trend: MoodTrend; lowStreak: number }>({ trend: "flat", lowStreak: 0 });
  useEffect(() => {
    try {
      const d = collectMoodHistory(localStorage);
      setMood({ trend: moodTrend(d), lowStreak: lowStreak(d) });
    } catch {}
  }, []);

  // instant deterministic stub, then upgrade in place to Claude's prose (AI on)
  useEffect(() => {
    if (!chart || !themeId) return;
    track("theme_view", { id: themeId });
    setR(generateThemeRead(chart, themeId));
    let alive = true;
    if (AI_ON) {
      setRefining(true);
      fetchThemeRead(chart, themeId, nickname)
        .then((real) => {
          if (alive && real) setR(real);
        })
        .finally(() => {
          if (alive) setRefining(false);
        });
    }
    return () => {
      alive = false;
    };
  }, [chart, themeId, nickname]);

  if (!ready || !chart) return null;

  if (!themeId) {
    return (
      <main className="phone" data-testid="theme">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>主题深读</h1>
        <div className="starfield" />
        <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--cream)" }}>这个主题还没解锁</div>
          <button type="button" onClick={() => router.replace("/chart")} style={{ color: "var(--gold-soft)", fontSize: 14, cursor: "pointer" }}>← 回到我的星盘</button>
        </div>
      </main>
    );
  }

  if (!r) return null;

  return (
    <main className="phone" data-testid="theme">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".2em", fontSize: 14, color: "var(--cream)" }}>{r.title}</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "10px 24px 24px" }}>
        <div data-testid="theme-read" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--gold-soft)", background: "rgba(201,168,97,.08)", border: "1px solid rgba(201,168,97,.28)", borderRadius: 20, padding: "6px 13px", margin: "8px 0 14px" }}>
          {r.planetLabel}
        </div>

        {/* keystone回喂: read this theme "with the current you in mind" (real mood signal) */}
        {memoryPreface(mood) && (
          <div data-testid="theme-memory" style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#bfe0f5", background: "rgba(143,194,232,.08)", border: "1px solid rgba(143,194,232,.22)", borderRadius: 12, padding: "10px 12px", marginBottom: 16, lineHeight: 1.6 }}>
            <span aria-hidden="true">🕯</span>
            <span><b style={{ color: "#dff0fc", fontWeight: 500 }}>我记得</b> · {memoryPreface(mood)}</span>
          </div>
        )}

        {refining && (
          <MollyThinking
            phrases={[`正在顺着「${r.title}」读你…`, "她在看，这块对你意味着什么…", "把你的星位，翻成你能用的话…", "快好了，她想说得更贴你…"]}
            style={{ marginBottom: 16 }}
          />
        )}

        {r.paragraphs.map((p, i) => (
          <p key={i} style={{ fontFamily: "var(--serif)", fontSize: p.catch ? 19 : 17.5, fontWeight: p.catch ? 500 : 400, fontStyle: p.catch ? "italic" : "normal", lineHeight: 1.75, marginBottom: 15, color: p.catch ? "var(--gold-soft)" : p.accent ? "var(--cream)" : "var(--cream-dim)", borderLeft: p.catch ? "2px solid var(--gold)" : "none", paddingLeft: p.catch ? 14 : 0 }}>
            {p.text}
          </p>
        ))}

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 9 }}>
          {r.chips.map((c) => (
            <button type="button" key={c} onClick={() => router.push(`/chat?ask=${encodeURIComponent(c)}`)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 12, padding: "11px 14px", fontSize: 13.5, color: "var(--cream-dim)", cursor: "pointer" }}>
              <span style={{ color: "var(--gold)" }} aria-hidden="true">›</span> {c}
            </button>
          ))}
        </div>

        {/* 更深的一层 — REAL content (r.deepRead), honest gating (§3.6): free at
            懂你度≥72 via 越用越准, OR the variabl-ready paywall slot. Nothing faked (§8). */}
        {(() => {
          const u = deepUnlock(understand);
          return (
            <div data-testid="deep-gate" style={{ marginTop: 18, borderRadius: 16, padding: "15px 16px", border: `1px solid ${u.unlocked ? "rgba(201,168,97,.4)" : "rgba(143,194,232,.3)"}`, background: u.unlocked ? "linear-gradient(180deg, rgba(201,168,97,.08), rgba(201,168,97,.02))" : "rgba(143,194,232,.05)" }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: u.unlocked ? "var(--gold)" : "#bfe0f5", marginBottom: 9 }}>
                {u.unlocked ? "✦ 更深的一层 · 已解锁" : `🔒 更深的一层：${r.title}里，你到底卡在哪`}
              </div>
              <p style={{ fontFamily: "var(--serif)", fontSize: 16.5, lineHeight: 1.75, color: "var(--cream)", filter: u.unlocked ? "none" : "blur(5px)", userSelect: u.unlocked ? "auto" : "none", transition: "filter .3s", margin: 0 }} aria-hidden={u.unlocked ? undefined : true}>
                {r.deepRead}
              </p>
              {u.unlocked ? (
                <div style={{ fontSize: 12, color: "var(--gold-soft)", marginTop: 8 }}>✓ 我们够熟了——这层，我讲给你听。</div>
              ) : (
                <div style={{ marginTop: 13 }}>
                  <div style={{ fontSize: 12, color: "var(--cream-dim)", marginBottom: 7 }}>越用越准 · 懂你度 <b style={{ color: "var(--blue)" }}>{understand}%</b> → {DEEP_UNLOCK_AT} 我就免费讲给你<span style={{ color: "var(--mute)" }}>（还差 {u.toGo}）</span></div>
                  <div style={{ height: 6, borderRadius: 4, background: "#1d2333", overflow: "hidden", marginBottom: 12 }}>
                    <i style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((understand / DEEP_UNLOCK_AT) * 100))}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} />
                  </div>
                  <div style={{ display: "flex", gap: 9 }}>
                    <button type="button" data-testid="deep-pay" onClick={() => setShowPaidNote(true)} style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 13, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", cursor: "pointer" }}>✦ 立即解锁</button>
                    <button type="button" onClick={() => router.push("/chat")} style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 13, color: "#bfe0f5", background: "rgba(143,194,232,.08)", border: "1px solid rgba(143,194,232,.3)", cursor: "pointer" }}>多聊聊，更快 →</button>
                  </div>
                  {showPaidNote && <div data-testid="paid-note" style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 10, lineHeight: 1.6 }}>付费解锁马上开放 🤍 现在先靠多聊几句——懂你度到 {DEEP_UNLOCK_AT}，我免费讲给你。</div>}
                </div>
              )}
            </div>
          );
        })()}

        <button type="button" onClick={() => router.push("/share")} style={{ display: "block", width: "100%", margin: "18px 0 6px", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这段存成卡片</button>
      </div>
    </main>
  );
}
