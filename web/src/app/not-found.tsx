import Link from "next/link";
// Root (non-[locale]) 404: sits OUTSIDE NextIntlClientProvider, so
// useTranslations is unavailable. Global fallback reached on routing misses,
// where the default locale (zh) applies — import its messages directly to keep
// strings in the message file (single source) and CJK-free.
import zhNotFound from "../../messages/zh/notFound.json";

export default function NotFound() {
  return (
    <main className="phone" data-testid="notfound">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 36, textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 38%, #1a2547 74%, #0c1124 100%)", boxShadow: "0 0 40px -8px rgba(201,168,97,.5)" }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 23, color: "var(--cream)", fontWeight: 600 }}>{zhNotFound.title}</div>
        <div style={{ fontSize: 13.5, color: "var(--mute)", lineHeight: 1.7, maxWidth: 260 }}>{zhNotFound.body}</div>
        <Link href="/today" style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", color: "#1a1408", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{zhNotFound.cta}</Link>
      </div>
    </main>
  );
}
