"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // TODO(obs): wire to error reporting (Sentry/console for now)
    console.error(error);
  }, [error]);

  return (
    <main className="phone" data-testid="error">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 36, textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 40%, #3a1f24 75%, #160a0c 100%)", boxShadow: "0 0 40px -8px rgba(229,115,111,.4)" }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 23, color: "var(--cream)", fontWeight: 600 }}>星图转动时卡了一下</div>
        <div style={{ fontSize: 13.5, color: "var(--mute)", lineHeight: 1.7, maxWidth: 260 }}>不是你的问题。给我一秒，重新为你对齐星盘。</div>
        <button onClick={reset} style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", color: "#1a1408", border: "none", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>再试一次</button>
      </div>
    </main>
  );
}
