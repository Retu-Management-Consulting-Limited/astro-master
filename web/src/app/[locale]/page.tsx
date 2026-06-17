import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CosmicEye } from "@/components/CosmicEye";

export default function Landing() {
  const t = useTranslations("landing");
  return (
    <main className="phone">
      <div className="starfield" />
      <div className="grain" />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 34px 40px",
          textAlign: "center",
        }}
      >
        <div className="reveal" style={{ animationDelay: ".1s" }}>
          <span className="brandname">MOLLY</span>
        </div>

        <div className="fadein" style={{ margin: "30px 0 24px", animationDelay: ".3s" }}>
          <CosmicEye />
        </div>

        <div>
          <div
            className="reveal"
            style={{ fontSize: 12.5, letterSpacing: ".24em", color: "var(--mute)", textTransform: "uppercase", marginBottom: 18, animationDelay: ".6s" }}
          >
            {t("kicker")}
          </div>
          <div className="reveal" style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 40, lineHeight: 1.24, animationDelay: ".8s" }}>
            {t("line1")}
          </div>
          <div className="reveal" style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 40, lineHeight: 1.24, color: "var(--gold-soft)", fontStyle: "italic", animationDelay: "1.05s" }}>
            {t("line2")}
          </div>
          <p className="reveal" style={{ marginTop: 22, fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--cream-dim)", maxWidth: 300, animationDelay: "1.5s" }}>
            告诉我你出生的那一刻，
            <br />
            <b style={{ color: "var(--cream)", fontWeight: 500 }}>剩下的，交给我。</b>
          </p>
        </div>

        <div className="reveal" style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", animationDelay: "1.9s" }}>
          <Link href="/input" className="gold-btn" style={{ display: "block", maxWidth: 320, textDecoration: "none" }}>
            {t("cta")}
          </Link>
          <div style={{ marginTop: 16, fontSize: 11.5, color: "var(--mute)", letterSpacing: ".04em" }}>
            内测中 · <b style={{ color: "var(--cream-dim)" }}>说穿你</b>，而不是说你的星座
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: "#5a6173" }}>
            — 一个<i style={{ color: "var(--irisc)", fontStyle: "normal" }}>不问你星座</i>的占星师 —
          </div>
        </div>
      </div>
    </main>
  );
}
