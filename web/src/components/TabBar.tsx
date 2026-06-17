import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Custom line-icons (stroke = currentColor → follows active/inactive color).
// Replaces the cross-platform-inconsistent emoji glyphs (☾✶✦). The brand eye
// stays for 对话.
function TabIcon({ id }: { id: string }) {
  if (id === "chat") return <span className="eye-mini" style={{ width: 18, height: 18 }} aria-hidden="true" />;
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (id === "today") return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
  if (id === "chart") return <svg {...common}><path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.2 6.9 18.9l1-5.7-4.1-4 5.7-.8z" /></svg>;
  // me
  return <svg {...common}><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
}

// T4 Phase 3 · 回 4 tab：财运不再占 tab，降为今日格 chip → /wealth 页（对称于身心
// 轨也 chip→/body）。/wealth 与 /body 仍渲染 <TabBar> 满足 route-exit guard，但它们
// 没有「自己的」active tab——传 active="wealth"/"body" 时不匹配任何 tab，0 高亮。
const TABS = [
  { id: "today", href: "/today" },
  { id: "chart", href: "/chart" },
  { id: "chat", href: "/chat" },
  { id: "me", href: "/me" },
] as const;

export function TabBar({ active }: { active: string }) {
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("ariaLabel")} style={{ position: "relative", zIndex: 4, flex: "0 0 auto", display: "flex", justifyContent: "space-around", padding: "10px 8px 16px", borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(0deg,#080a12,rgba(8,10,18,.6))" }}>
      {TABS.map((tab) => (
        <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontSize: 10.5, color: active === tab.id ? "var(--gold)" : "#5a6173", flex: 1, textDecoration: "none", minHeight: 44, justifyContent: "center" }}>
          <TabIcon id={tab.id} />
          {t(tab.id)}
        </Link>
      ))}
    </nav>
  );
}
