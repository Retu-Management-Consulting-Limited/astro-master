"use client";
import { useEffect, useState } from "react";

// "Molly is thinking" — shown during the slow SDK calls (40-90s) so the user
// stays. A breathing cosmic eye + rotating, personalized thinking phrases +
// animated dots. Past a threshold it adds an escalating REASSURANCE line that
// reframes the slowness as care ("她读得慢，是因为认真地读你") — the single most
// effective anti-abandonment move on a long wait.
// `band` = slim inline banner; `bubble` = chat message.

export interface Reassurance {
  afterMs: number;
  text: string;
}

const DEFAULT_REASSURE: Reassurance[] = [
  { afterMs: 38000, text: "她读得有点慢——因为她在很认真地读你，别走开。" },
  { afterMs: 72000, text: "再给她一点点，这一段，她想为你写到对。" },
];

export function MollyThinking({
  phrases,
  variant = "band",
  style,
  reassurances = DEFAULT_REASSURE,
}: {
  phrases: string[];
  variant?: "band" | "bubble";
  style?: React.CSSProperties;
  reassurances?: Reassurance[];
}) {
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % phrases.length), 3000);
    return () => clearInterval(id);
  }, [phrases.length]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);

  // latest reassurance whose threshold has passed
  const reassure = [...reassurances].reverse().find((r) => elapsed >= r.afterMs)?.text;

  const eye = <div className="eye-mini think-eye" style={{ width: 26, height: 26 }} />;
  const dots = (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "flex-end", height: 14 }}>
      {[0, 1, 2].map((d) => (
        <span key={d} className="think-dot" style={{ animationDelay: `${d * 0.18}s` }} />
      ))}
    </span>
  );
  const phraseColor = variant === "bubble" ? "var(--cream-dim)" : "var(--gold-soft)";

  const inner = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span key={i} className="think-phrase" style={{ fontSize: variant === "bubble" ? 13.5 : 12.5, color: phraseColor, lineHeight: 1.3 }}>
          {phrases[i]}
        </span>
        {dots}
      </div>
      {reassure && (
        <div key={reassure} className="think-phrase" style={{ marginTop: 6, fontSize: 11.5, color: "var(--mute)", fontStyle: "italic", lineHeight: 1.5 }}>
          {reassure}
        </div>
      )}
    </div>
  );

  if (variant === "bubble") {
    return (
      <div data-testid="thinking" role="status" aria-live="polite" aria-label="Molly 正在思考" style={{ maxWidth: "88%", marginBottom: 14, marginRight: "auto", ...style }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, borderRadius: 16, borderBottomLeftRadius: 5, padding: "11px 14px", background: "#141a28", border: "1px solid #232c3e" }}>
          {eye}
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="thinking" role="status" aria-live="polite" aria-label="Molly 正在思考" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 13px", borderRadius: 12, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.25)", ...style }}>
      {eye}
      {inner}
    </div>
  );
}
