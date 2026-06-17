import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Localized not-found for the [locale] segment (thrown via notFound()).
// Styles preserved verbatim from the original app/not-found.tsx; only the
// copy source (next-intl) and Link import (locale-aware) changed.
export default function LocaleNotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="phone" data-testid="notfound">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 36, textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 38%, #1a2547 74%, #0c1124 100%)", boxShadow: "0 0 40px -8px rgba(201,168,97,.5)" }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 23, color: "var(--cream)", fontWeight: 600 }}>{t("title")}</div>
        <div style={{ fontSize: 13.5, color: "var(--mute)", lineHeight: 1.7, maxWidth: 260 }}>{t("body")}</div>
        <Link href="/today" style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", color: "#1a1408", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{t("cta")}</Link>
      </div>
    </main>
  );
}
