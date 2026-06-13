"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { generateFirstRead } from "@/lib/reading/generate";
import { LoadingRitual } from "@/components/LoadingRitual";

export default function ReadingPage() {
  const router = useRouter();
  const chart = useFunnel((s) => s.chart);
  const ascCandidate = useFunnel((s) => s.ascCandidate);
  const setFirstRead = useFunnel((s) => s.setFirstRead);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chart) router.replace("/input");
  }, [chart, router]);

  const read = useMemo(() => (chart ? generateFirstRead(chart) : null), [chart]);
  useEffect(() => {
    if (read) setFirstRead(read);
  }, [read, setFirstRead]);

  if (loading || !read) return <LoadingRitual line="我看到你了。<br/>给我一点时间……" sub="正在解读你的盘…" ms={1500} onDone={() => setLoading(false)} />;

  const gate = () => router.push("/register");

  return (
    <main className="phone" data-testid="firstread">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "26px 26px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>为你校准 · 上升 <b style={{ color: "var(--gold)" }}>{ascCandidate ?? read.ascSign}</b></span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "26px 28px 12px" }}>
        <div className="reveal" style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600, fontSize: 26, color: "var(--cream)", lineHeight: 1.35, marginBottom: 22, animationDelay: ".4s" }}>{read.lead}</div>
        {read.paragraphs.map((p, i) => (
          <p key={i} className="reveal" style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 21, lineHeight: 1.62, color: "var(--cream-dim)", marginBottom: 18, animationDelay: `${0.9 + i * 0.6}s` }}
            dangerouslySetInnerHTML={{ __html: p.text }} />
        ))}

        <div className="reveal" style={{ margin: "30px 0 8px", textAlign: "center", animationDelay: "3.4s" }}>
          <div style={{ width: 30, height: 1, background: "var(--gold)", margin: "0 auto 18px" }} />
          <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 27, lineHeight: 1.45, color: "var(--gold-soft)", textShadow: "0 0 26px rgba(201,168,97,.28)" }}>{read.quote}</div>
        </div>

        <div className="reveal" style={{ marginTop: 30, animationDelay: "3.9s" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>✦ <span style={{ color: "var(--gold)" }}>为你挑的</span></div>
          {read.chips.map((c, i) => (
            <button key={i} data-testid="chip" onClick={gate}
              style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(124,150,170,.08)", border: "1px solid #2b3a4e", borderRadius: 13, padding: "13px 15px", color: "#a9c4dd", fontSize: 14.5, marginBottom: 9, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "12px 22px 20px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 11 }}>
          <div onClick={gate} style={{ flex: 1, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 22, padding: "12px 16px", color: "#566073", fontSize: 14, cursor: "pointer" }}>问问她……</div>
          <div onClick={gate} style={{ width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", background: "linear-gradient(135deg,var(--gold),var(--gold-soft))" }}>➤</div>
        </div>
        <div onClick={gate} data-testid="save-card" style={{ textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这段存成卡片</div>
      </div>
    </main>
  );
}
