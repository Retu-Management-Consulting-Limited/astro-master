"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { generateFirstRead, type FirstRead } from "@/lib/reading/generate";
import { fetchFirstRead, AI_ON } from "@/lib/reading/remote";
import { LoadingRitual } from "@/components/LoadingRitual";
import { MollyThinking } from "@/components/MollyThinking";
import { sanitizeRichText } from "@/lib/sanitize";
import { track } from "@/lib/track";

export default function ReadingPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const ascCandidate = useFunnel((s) => s.ascCandidate);
  const timeUnknown = useFunnel((s) => s.birthForm?.knownTime ?? false); // knownTime === true means time is UNKNOWN
  const nickname = useFunnel((s) => s.nickname);
  const setFirstRead = useFunnel((s) => s.setFirstRead);
  const [read, setRead] = useState<FirstRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    if (!chart) return; // useChartGuard handles the redirect once hydrated (P1-1)
    let cancelled = false;

    // Progressive: show the instant deterministic stub after a brief ritual,
    // then upgrade IN PLACE to Claude's reading when it arrives (no long wait).
    const stub = generateFirstRead(chart);
    const timer = setTimeout(() => {
      if (cancelled) return;
      setRead((prev) => prev ?? stub);
      setFirstRead(stub);
      setLoading(false);
      track("first_read", { ai: false }); // activation peak reached (stub shown)
    }, 1400);

    if (AI_ON) {
      setRefining(true);
      fetchFirstRead(chart, nickname)
        .then((real) => {
          if (!cancelled && real) {
            setRead(real);
            setFirstRead(real);
            track("first_read", { ai: true }); // real Molly reading landed
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setRefining(false);
        });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, nickname, router, setFirstRead]);

  if (!ready || !chart) return null; // wait for rehydration; guard redirects if truly no chart (P1-1)
  if (loading || !read)
    return <LoadingRitual line="我看到你了。<br/>给我一点时间……" sub="正在解读你的盘…" ms={9_999_999} onDone={() => {}} />;

  const gate = () => router.push("/register");

  return (
    <main className="phone" data-testid="firstread">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "26px 26px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>{timeUnknown ? <>据描述推测 · 上升 <b style={{ color: "var(--gold)" }}>{ascCandidate ?? read.ascSign}</b></> : <>上升 <b style={{ color: "var(--gold)" }}>{read.ascSign}</b></>}</span>
      </div>
      {refining && (
        <div style={{ position: "relative", zIndex: 3, padding: "10px 24px 0" }}>
          <MollyThinking
            phrases={[
              "正在对齐你的星盘…",
              chart?.placements.find((p) => p.body === "Moon")?.sign
                ? `她在读你的月亮·${chart.placements.find((p) => p.body === "Moon")!.sign}…`
                : "她在读你的月亮…",
              "把你的样子，和你的盘对上…",
              "在斟酌——怎么说，才不伤你、又够准…",
              "快好了，她想把这一段，写得更像你…",
            ]}
          />
        </div>
      )}

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "26px 28px 12px" }}>
        <div className="reveal" style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600, fontSize: 26, color: "var(--cream)", lineHeight: 1.35, marginBottom: 22, animationDelay: ".4s" }}>{read.lead}</div>
        {read.paragraphs.map((p, i) => (
          <p key={i} className="reveal" style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 21, lineHeight: 1.62, color: "var(--cream-dim)", marginBottom: 18, animationDelay: `${0.9 + i * 0.6}s` }}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(p.text) }} />
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
          <button type="button" onClick={gate} style={{ flex: 1, textAlign: "left", background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 22, padding: "12px 16px", color: "#566073", fontSize: 14, cursor: "pointer" }}>问问她……</button>
          <button type="button" onClick={gate} aria-label="发送" style={{ width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", background: "linear-gradient(135deg,var(--gold),var(--gold-soft))" }}>➤</button>
        </div>
        <button type="button" onClick={gate} data-testid="save-card" style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这段存成卡片</button>
      </div>
    </main>
  );
}
