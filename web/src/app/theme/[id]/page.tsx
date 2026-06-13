"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { generateThemeRead, THEME_IDS, type ThemeId, type ThemeRead } from "@/lib/reading/theme";
import { fetchThemeRead, AI_ON } from "@/lib/reading/remote";
import { MollyThinking } from "@/components/MollyThinking";
import { track } from "@/lib/track";

export default function ThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const themeId = (THEME_IDS as string[]).includes(id) ? (id as ThemeId) : null;
  const [r, setR] = useState<ThemeRead | null>(null);
  const [refining, setRefining] = useState(false);

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
        <div className="starfield" />
        <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--cream)" }}>这个主题还没解锁</div>
          <div onClick={() => router.replace("/chart")} style={{ color: "var(--gold-soft)", fontSize: 14, cursor: "pointer" }}>← 回到我的星盘</div>
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
        <span onClick={() => router.back()} style={{ fontSize: 20, color: "var(--mute)", cursor: "pointer" }}>←</span>
        <span style={{ fontWeight: 500, letterSpacing: ".2em", fontSize: 14, color: "var(--cream)" }}>{r.title}</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "10px 24px 24px" }}>
        <div data-testid="theme-read" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--gold-soft)", background: "rgba(201,168,97,.08)", border: "1px solid rgba(201,168,97,.28)", borderRadius: 20, padding: "6px 13px", margin: "8px 0 18px" }}>
          {r.planetLabel}
        </div>

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
            <div key={c} onClick={() => router.push("/chat")} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 12, padding: "11px 14px", fontSize: 13.5, color: "var(--cream-dim)", cursor: "pointer" }}>
              <span style={{ color: "var(--gold)" }}>›</span> {c}
            </div>
          ))}
        </div>

        {/* 更深的一层 — paywall stub. TODO(key): gated deep synthesis via Claude. */}
        <div style={{ marginTop: 18, borderRadius: 14, padding: "15px 16px", border: "1px solid rgba(201,168,97,.3)", background: "linear-gradient(180deg, rgba(201,168,97,.07), rgba(201,168,97,.02))", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: "var(--gold-soft)" }}>🔒 更深的一层：{r.title}里，你到底卡在哪</div>
          <div style={{ fontSize: 11, color: "#5f6675", marginTop: 5 }}>解锁完整解读 · 即将开放</div>
        </div>

        <div onClick={() => router.push("/share")} style={{ margin: "18px 0 6px", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这段存成卡片</div>
      </div>
    </main>
  );
}
