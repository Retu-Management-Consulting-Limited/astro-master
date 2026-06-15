"use client";
import { useMemo, useState } from "react";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { buildCardSVG, svgToPngBlob, type Template, type CardData } from "@/lib/share/card";
import { BackButton } from "@/components/BackButton";
import { track } from "@/lib/track";

const HOUSE_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
const TPLS: Template[] = ["a", "b", "c", "d"];

export default function SharePage() {
  const { chart, ready } = useChartGuard();
  const firstRead = useFunnel((s) => s.firstRead);
  const birthForm = useFunnel((s) => s.birthForm);
  const [tpl, setTpl] = useState<Template>("a");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data: CardData | null = useMemo(() => {
    if (!chart) return null;
    const sun = chart.placements.find((p) => p.body === "Sun");
    const moon = chart.placements.find((p) => p.body === "Moon");
    const city = birthForm?.city?.trim();
    const dedication = city ? `致 · 漂在${city}，假装很好的你` : "致 · 假装很好的你";
    const signs = `☉ ${sun?.sign ?? "—"}　☽ ${moon?.sign ?? "—"}·${HOUSE_ZH[moon?.house ?? 1]}宫　↑ ${chart.ascSign}`;
    const quote = (firstRead?.quote ?? "你最大的本事，是让所有人都以为你不需要任何人。").replace(/[「」“”]/g, "");
    return { dedication, quote, signs };
  }, [chart, firstRead, birthForm]);

  if (!ready || !data) return null;

  const cardSVG = buildCardSVG(data, tpl);

  async function exportPng(): Promise<void> {
    if (busy || !data) return;
    setBusy(true);
    try {
      const scale = 3;
      const svg = buildCardSVG(data, tpl, { forExport: true, scale });
      const blob = await svgToPngBlob(svg, 318 * scale, 424 * scale);
      const file = new File([blob], "molly-card.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      track("share", { tpl });
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], text: "我的本命金句 · Molly 看穿你的本命" });
        setToast("已唤起分享");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "molly-card.png";
        a.click();
        URL.revokeObjectURL(url);
        setToast("已保存图片 ✓");
      }
    } catch {
      setToast("生成失败，再试一次");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1800);
    }
  }

  // Honest: both call exportPng → "分享" opens the system share sheet (where
  // 微信/小红书/IG appear), "保存图片" downloads. No fake per-channel deep-links (SHR-1).
  const channels = [
    { id: "share", ic: "↗", l: "分享", bg: "linear-gradient(135deg,var(--gold),var(--gold-soft))", fg: "#1a1305" },
    { id: "save", ic: "⤓", l: "保存图片", bg: "#1c2230", fg: "var(--gold)" },
  ];

  return (
    <main className="phone" data-testid="share">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", padding: "22px 24px 6px" }}>
        <BackButton variant="close" />
        <span style={{ flex: 1, textAlign: "center", fontSize: 14, color: "var(--cream)", fontWeight: 500 }}>分享这一句</span>
        <span style={{ width: 20 }} />
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 26px" }}>
        <div data-testid="share-card" style={{ width: 318, height: 424, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(201,168,97,.2)" }} dangerouslySetInnerHTML={{ __html: cardSVG }} />

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          {TPLS.map((t) => {
            const thumb = buildCardSVG(data, t);
            return (
              <button type="button" key={t} data-testid="tpl" aria-label={`样式 ${t.toUpperCase()}`} aria-pressed={tpl === t} onClick={() => setTpl(t)} style={{ width: 36, height: 48, borderRadius: 7, overflow: "hidden", cursor: "pointer", padding: 0, outline: tpl === t ? "2px solid var(--gold)" : "1px solid #2a3344", outlineOffset: tpl === t ? 1 : 0 }} dangerouslySetInnerHTML={{ __html: thumb }} />
            );
          })}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "14px 22px 24px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 6 }}>
          {channels.map((c) => (
            <button type="button" key={c.id} data-testid={c.id === "save" ? "save-png" : undefined} aria-label={c.l} disabled={busy} onClick={exportPng} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
              <div aria-hidden="true" style={{ width: 54, height: 54, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, background: c.bg, color: c.fg, border: c.id === "save" ? "1px solid #2b3445" : "none" }}>{c.ic}</div>
              <div style={{ fontSize: 11, color: "var(--cream-dim)" }}>{c.l}</div>
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "absolute", left: "50%", bottom: 110, transform: "translateX(-50%)", zIndex: 9, background: "rgba(10,12,20,.92)", border: "1px solid var(--field-bd)", color: "var(--cream)", fontSize: 13, padding: "9px 18px", borderRadius: 12, whiteSpace: "nowrap" }}>{toast}</div>
      )}
    </main>
  );
}
