"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { generateFirstRead, type FirstRead } from "@/lib/reading/generate";
import { fetchFirstRead, AI_ON } from "@/lib/reading/remote";
import { LoadingRitual } from "@/components/LoadingRitual";
import { MollyThinking } from "@/components/MollyThinking";
import { TimeDetective } from "@/components/TimeDetective";
import { sanitizeRichText } from "@/lib/sanitize";
import { track } from "@/lib/track";

export default function ReadingPage() {
  const t = useTranslations("reading");
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const ascCandidate = useFunnel((s) => s.ascCandidate);
  const timeBelief = useFunnel((s) => s.timeBelief); // seeded by /calibration 人生大事 → 时辰侦探 揭晓处
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
    return <LoadingRitual line={t("loadingLine")} sub={t("loadingSub")} ms={9_999_999} onDone={() => {}} />;

  const gate = () => router.push("/register");

  return (
    <main className="phone" data-testid="firstread">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srHeading")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "26px 26px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>{timeUnknown ? <>{t("ascGuessed")} <b style={{ color: "var(--gold)" }}>{ascCandidate ?? read.ascSign}</b></> : <>{t("ascKnown")} <b style={{ color: "var(--gold)" }}>{read.ascSign}</b></>}</span>
      </div>
      {refining && (
        <div style={{ position: "relative", zIndex: 3, padding: "10px 24px 0" }}>
          <MollyThinking
            phrases={[
              t("thinking.aligning"),
              chart?.placements.find((p) => p.body === "Moon")?.sign
                ? t("thinking.moonNamed", { sign: chart.placements.find((p) => p.body === "Moon")!.sign })
                : t("thinking.moon"),
              t("thinking.matching"),
              t("thinking.weighing"),
              t("thinking.almost"),
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

        {timeBelief && (
          <div className="reveal" style={{ marginTop: 30, animationDelay: "3.7s" }}>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>✦ <span style={{ color: "var(--gold)" }}>{t("sectionTime")}</span></div>
            <TimeDetective belief={timeBelief} />
          </div>
        )}

        <div className="reveal" style={{ marginTop: 30, animationDelay: "3.9s" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>✦ <span style={{ color: "var(--gold)" }}>{t("sectionPicked")}</span></div>
          {read.chips.map((c, i) => (
            <button key={i} data-testid="chip" onClick={gate}
              style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(124,150,170,.08)", border: "1px solid #2b3a4e", borderRadius: 13, padding: "13px 15px", color: "#a9c4dd", fontSize: 14.5, marginBottom: 9, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "12px 22px 20px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <button type="button" onClick={gate} className="gold-btn" style={{ marginBottom: 11, fontSize: 15 }}>{t("ctaChat")}</button>
        <button type="button" onClick={gate} data-testid="save-card" style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, color: "var(--gold-soft)", cursor: "pointer" }}>{t("ctaSave")}</button>
      </div>
    </main>
  );
}
