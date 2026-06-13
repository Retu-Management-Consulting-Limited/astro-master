"use client";
import { useEffect, useState } from "react";

// "Molly is thinking" — shown during the slow SDK calls (40-90s) so the user
// stays. A breathing cosmic eye + rotating, personalized thinking phrases +
// animated dots: reads as Molly actively poring over *your* chart, not a
// frozen spinner. `band` = slim inline banner; `bubble` = chat message.
export function MollyThinking({
  phrases,
  variant = "band",
  style,
}: {
  phrases: string[];
  variant?: "band" | "bubble";
  style?: React.CSSProperties;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % phrases.length), 3000);
    return () => clearInterval(id);
  }, [phrases.length]);

  const eye = <div className="eye-mini think-eye" style={{ width: 26, height: 26 }} />;
  const dots = (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "flex-end", height: 14 }}>
      {[0, 1, 2].map((d) => (
        <span key={d} className="think-dot" style={{ animationDelay: `${d * 0.18}s` }} />
      ))}
    </span>
  );
  const phrase = (
    <span
      key={i}
      className="think-phrase"
      style={{ fontSize: variant === "bubble" ? 13.5 : 12.5, color: variant === "bubble" ? "var(--cream-dim)" : "var(--gold-soft)" }}
    >
      {phrases[i]}
    </span>
  );

  if (variant === "bubble") {
    return (
      <div data-testid="thinking" style={{ maxWidth: "86%", marginBottom: 14, marginRight: "auto", ...style }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, borderRadius: 16, borderBottomLeftRadius: 5, padding: "11px 14px", background: "#141a28", border: "1px solid #232c3e" }}>
          {eye}
          {phrase}
          {dots}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="thinking"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 12, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.25)", ...style }}
    >
      {eye}
      <span style={{ flex: 1, lineHeight: 1.3 }}>{phrase}</span>
      {dots}
    </div>
  );
}
