import Link from "next/link";

// Custom line-icons (stroke = currentColor → follows active/inactive color).
// Replaces the cross-platform-inconsistent emoji glyphs (☾✶✦). The brand eye
// stays for 对话.
function TabIcon({ id }: { id: string }) {
  if (id === "chat") return <span className="eye-mini" style={{ width: 18, height: 18 }} aria-hidden="true" />;
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (id === "today") return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
  if (id === "money") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v10M9.4 9.2a2.6 2.6 0 0 1 2.6-1.2c1.4 0 2.4.8 2.4 1.9 0 2.4-5 1.6-5 4 0 1.1 1 1.9 2.4 1.9a2.6 2.6 0 0 0 2.6-1.2" /></svg>;
  if (id === "chart") return <svg {...common}><path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.2 6.9 18.9l1-5.7-4.1-4 5.7-.8z" /></svg>;
  // me
  return <svg {...common}><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
}

const TABS = [
  { id: "today", href: "/today", label: "今日" },
  { id: "money", href: "/wealth", label: "财运" },
  { id: "chart", href: "/chart", label: "本命" },
  { id: "chat", href: "/chat", label: "对话" },
  { id: "me", href: "/me", label: "我的" },
];

export function TabBar({ active }: { active: string }) {
  return (
    <nav aria-label="主导航" style={{ position: "relative", zIndex: 4, flex: "0 0 auto", display: "flex", justifyContent: "space-around", padding: "10px 8px 16px", borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(0deg,#080a12,rgba(8,10,18,.6))" }}>
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} aria-current={active === t.id ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontSize: 10.5, color: active === t.id ? "var(--gold)" : "#5a6173", flex: 1, textDecoration: "none", minHeight: 44, justifyContent: "center" }}>
          <TabIcon id={t.id} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
