"use client";
import { useTranslations, useLocale } from "next-intl";
import { signLabel } from "@/i18n/glossary";
import { useRouter } from "@/i18n/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { metLabel } from "@/lib/relationship";
import { birthSummary } from "@/lib/birth";
import { TabBar } from "@/components/TabBar";
import { TimeDetective } from "@/components/TimeDetective";
import { useUnderstanding } from "@/lib/understanding";

export default function MePage() {
  const t = useTranslations("me");
  const locale = useLocale();
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const birthForm = useFunnel((s) => s.birthForm);
  const firstRead = useFunnel((s) => s.firstRead);
  const timeBelief = useFunnel((s) => s.timeBelief); // 时辰侦探 回看
  const understand = useUnderstanding();
  if (!ready || !chart) return null;

  const selfQuote = firstRead?.quote ?? t("selfQuoteFallback");

  const rows = [
    { ic: "💰", t: t("rowWealth"), badge: t("rowWealthBadge"), href: "/wealth" },
    { ic: "💞", t: t("rowSynastry"), arr: "›", href: "/synastry" },
    { ic: "🕰️", t: t("rowHistory"), badge: t("rowHistoryBadge"), href: "/history" },
    { ic: "📤", t: t("rowCard"), arr: "›", href: "/share" },
    { ic: "⚙️", t: t("rowSettings"), arr: "›", href: "/me/settings" },
  ];

  return (
    <main className="phone" data-testid="me">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "24px 22px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div className="eye-mini" style={{ width: 60, height: 60 }} />
          <div>
            <div style={{ fontSize: 18, color: "var(--cream)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{nickname ?? t("nicknameFallback")}</div>
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 3 }}>{metLabel(joinedAt)} · {t("rowAscendant")}{signLabel(chart.ascSign, locale)}</div>
          </div>
        </div>

        <button type="button" data-testid="birth-card" onClick={() => router.push("/me/birth")} style={{ width: "100%", textAlign: "left", background: "rgba(143,182,216,.06)", border: "1px solid rgba(143,182,216,.2)", borderRadius: 16, padding: "14px 16px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>🎂</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 3 }}>{t("birthInfoLabel")}</div>
            <div data-testid="birth-summary" style={{ fontSize: 14, color: "var(--cream)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{birthSummary(birthForm)}</div>
          </div>
          <span style={{ marginLeft: "auto", color: "var(--gold-soft)", fontSize: 13, flex: "0 0 auto" }}>{t("birthEdit")}</span>
        </button>

        <button type="button" onClick={() => router.push("/history")} style={{ width: "100%", textAlign: "left", display: "block", background: "linear-gradient(180deg, rgba(201,168,97,.08), rgba(201,168,97,.02))", border: "1px solid rgba(201,168,97,.32)", borderRadius: 18, padding: 16, marginBottom: 18, boxShadow: "0 0 30px -14px rgba(201,168,97,.4)", cursor: "pointer" }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>{t("selfHeading")}</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, color: "var(--gold-soft)", lineHeight: 1.45, marginBottom: 10 }}>&ldquo;{selfQuote}&rdquo;</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--cream-dim)" }}>
            {t("understandLabel")} <span style={{ flex: 1, maxWidth: 120, height: 5, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${understand}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> {understand}% <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: 12 }}>{t("understandSeeFull")}</span>
          </div>
        </button>

        {timeBelief && (
          <div data-testid="me-time-detective" style={{ marginBottom: 18 }}>
            <TimeDetective belief={timeBelief} />
          </div>
        )}

        <div>
          {rows.map((r) => (
            <button type="button" key={r.t} data-testid={r.href ? `row-${r.href.slice(1)}` : undefined} onClick={() => r.href && router.push(r.href)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", borderBottom: "1px solid rgba(255,255,255,.05)", fontSize: 15, color: "var(--cream-dim)", cursor: r.href ? "pointer" : "default" }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }} aria-hidden="true">{r.ic}</span>{r.t}
              {r.badge ? <span style={{ marginLeft: "auto", background: "#1f2a44", color: "#9ecbff", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>{r.badge}</span> : <span style={{ marginLeft: "auto", color: "#4f5666" }}>{r.arr}</span>}
            </button>
          ))}
        </div>
      </div>
      <TabBar active="me" />
    </main>
  );
}
