"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CosmicEye } from "./CosmicEye";

export function LoadingRitual({
  line,
  sub,
  ms = 1300,
  onDone,
}: {
  line?: string;
  sub?: string;
  ms?: number;
  onDone: () => void;
}) {
  const t = useTranslations("components.loadingRitual");
  const lineText = line ?? t("line");
  const subText = sub ?? t("sub");
  useEffect(() => {
    const timer = setTimeout(onDone, ms);
    return () => clearTimeout(timer);
  }, [ms, onDone]);

  return (
    <main className="phone" data-testid="loading">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <CosmicEye />
        <div style={{ marginTop: 40, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, color: "var(--gold-soft)", textShadow: "0 0 22px rgba(201,168,97,.25)" }} dangerouslySetInnerHTML={{ __html: lineText }} />
        <div style={{ marginTop: 22, width: 160, height: 2, background: "#1d2333", borderRadius: 2, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, height: "100%", width: "40%", background: "linear-gradient(90deg,transparent,var(--gold),transparent)", animation: "lbar 1.4s ease-in-out infinite" }} />
        </div>
        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--mute)" }}>{subText}</div>
      </div>
      <style>{`@keyframes lbar{0%{left:-40%}100%{left:120%}}`}</style>
    </main>
  );
}
