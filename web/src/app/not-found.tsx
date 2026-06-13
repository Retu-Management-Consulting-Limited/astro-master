import Link from "next/link";

export default function NotFound() {
  return (
    <main className="phone" data-testid="notfound">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 36, textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 38%, #1a2547 74%, #0c1124 100%)", boxShadow: "0 0 40px -8px rgba(201,168,97,.5)" }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 23, color: "var(--cream)", fontWeight: 600 }}>这片星空，是空的</div>
        <div style={{ fontSize: 13.5, color: "var(--mute)", lineHeight: 1.7, maxWidth: 260 }}>你要找的页面不在这条星轨上。回去，我接着给你看你的盘。</div>
        <Link href="/today" style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", color: "#1a1408", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>回到今日</Link>
      </div>
    </main>
  );
}
