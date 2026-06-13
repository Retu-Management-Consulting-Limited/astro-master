import Link from "next/link";

const TABS = [
  { id: "today", href: "/today", ic: "☾", label: "今日" },
  { id: "chart", href: "/chart", ic: "✶", label: "本命" },
  { id: "chat", href: "/chat", ic: "eye", label: "对话" },
  { id: "me", href: "/me", ic: "✦", label: "我的" },
];

export function TabBar({ active }: { active: string }) {
  return (
    <div style={{ position: "relative", zIndex: 4, flex: "0 0 auto", display: "flex", justifyContent: "space-around", padding: "10px 8px 16px", borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(0deg,#080a12,rgba(8,10,18,.6))" }}>
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontSize: 10.5, color: active === t.id ? "var(--gold)" : "#5a6173", flex: 1, textDecoration: "none" }}>
          {t.ic === "eye" ? <span className="eye-mini" style={{ width: 18, height: 18 }} /> : <span style={{ fontSize: 17 }}>{t.ic}</span>}
          {t.label}
        </Link>
      ))}
    </div>
  );
}
