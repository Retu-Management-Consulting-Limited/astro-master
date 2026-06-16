import type { TodayVerdict } from "@/lib/reading/todayVerdict";
import type { DailyReading } from "@/lib/reading/daily";

// 今日格 · 三态变身（design/20-today-cell-states.html）。
//
// 一张卡，按 todayVerdict.state 长成三副面孔，槽位严格对齐 charter 附录A：
//   • plain（天清/平淡，多数日）：先歇（赦免）+ 备战糖(prep)，不空屏 = 维生素天天响。
//   • red（慎，稀有·刹车）     ：命令叫停(line) + 内在why + 赦免糖(quote) + 前门(door→那天财运)。
//   • green（旺，稀有·勇气义肢）：命令出手(line) + 可晒"财运旺"badge(轻免责) + 落到可控动作(action)。
// 每一态都带 fortune chip（钱轨入口），点进 /wealth。
//
// 纯展示组件：所有内容来自 props（todayVerdict + dailyReading 背景层），不自己取数、
// 不依赖 store/router，便于 jsdom smoke。文案是否过 money guardrail 由 todayVerdict 负责，
// 此处只渲染。声音守宪法 §8：红日是"前门"（引去看真实星象）不是恐吓。

const DOT = (c: string, glow = false): React.CSSProperties => ({
  width: 6, height: 6, borderRadius: "50%", background: c, ...(glow ? { boxShadow: `0 0 8px ${c}` } : {}),
});
const TAG: React.CSSProperties = {
  fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9,
  display: "flex", alignItems: "center", gap: 7,
};

export function TodayCell({
  verdict, daily, onWealth,
}: {
  verdict: TodayVerdict;
  daily: DailyReading;
  onWealth: (selDay?: number) => void;
}) {
  // 每态共用的 fortune chip — plain/red 用 flat 灰底，green 用绿底（呼应主态）。
  const chip = (flat: boolean, label: string, txt: string, accent: string, accentSoft: string) => (
    <button
      type="button"
      data-testid="fortune-chip"
      onClick={() => onWealth(verdict.doorDate ? Number(verdict.doorDate.slice(-2)) : undefined)}
      style={{
        width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: 12,
        padding: "9px 12px", borderRadius: 11, cursor: "pointer", fontSize: 12.5, color: accent,
        background: flat ? "rgba(122,129,148,.08)" : "rgba(127,201,154,.08)",
        border: `1px solid ${flat ? "rgba(122,129,148,.28)" : "rgba(127,201,154,.3)"}`,
      }}
    >
      <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <span>今日财运 <b style={{ color: accentSoft }}>{label}</b> · {txt}</span>
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>查日历 →</span>
    </button>
  );

  // ── 绿 · 旺（勇气义肢）──
  if (verdict.state === "green") {
    return (
      <div
        data-testid="today-card"
        style={{
          borderRadius: 17, padding: "15px 16px", marginBottom: 12,
          border: "1px solid rgba(127,201,154,.42)",
          background: "linear-gradient(180deg,rgba(127,201,154,.09),rgba(127,201,154,.02))",
          boxShadow: "0 0 28px -12px rgba(127,201,154,.5)",
        }}
      >
        <div style={{ ...TAG, color: "var(--green)" }}>
          <span style={DOT("var(--green)", true)} aria-hidden="true" />今天 · 宜
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 9 }}>
          <span data-testid="today-wang-badge" style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#1a1206",
            background: "linear-gradient(90deg,var(--gold-soft),var(--gold))", padding: "3px 9px", borderRadius: 20, fontWeight: 600,
          }}>✦ 财运旺 · 搞钱黄金日</span>
          <span style={{ fontSize: 11, color: "var(--gold-deep)" }}>旺的是时机，不是保证</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: "#b6e8c8" }}>{verdict.line}</div>
        <div style={{ marginTop: 9, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16.5, lineHeight: 1.5, color: "var(--gold-soft)" }}>{verdict.quote}</div>
        {verdict.action && (
          <div data-testid="today-action" style={{ marginTop: 12, background: "rgba(127,201,154,.1)", borderLeft: "3px solid var(--green)", borderRadius: 9, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55, color: "#def0e6" }}>
            ▸ {verdict.action}
          </div>
        )}
        {chip(false, "旺", "今天去推", "var(--green)", "#a8e0bf")}
      </div>
    );
  }

  // ── 红 · 慎（刹车）──
  if (verdict.state === "red") {
    return (
      <div
        data-testid="today-card"
        style={{
          borderRadius: 17, padding: "15px 16px", marginBottom: 12,
          border: "1px solid rgba(224,120,106,.45)",
          background: "linear-gradient(180deg,rgba(224,120,106,.09),rgba(224,120,106,.02))",
          boxShadow: "0 0 28px -12px rgba(224,120,106,.5)",
        }}
      >
        <div style={{ ...TAG, color: "var(--red)" }}>
          <span style={DOT("var(--red)", true)} aria-hidden="true" />今天 · 慎
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 600, lineHeight: 1.25, marginBottom: 8, color: "#f0b6ab" }}>{verdict.line}</div>
        {/* 内在 why — 把"为什么慎"指回星象/自身节律，不是外部坏后果（§8 不靠编造恐吓）*/}
        {daily.backdropLine && <div style={{ fontSize: 12.5, color: "var(--mute)", marginBottom: 6 }}>{daily.backdropLine}</div>}
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16.5, lineHeight: 1.5, color: "var(--cream-dim)" }}>{verdict.quote}</div>
        {/* 前门：留一道门，点进去看那天财运（doorDate 当天）*/}
        <button
          type="button"
          data-testid="today-door"
          onClick={() => onWealth(verdict.doorDate ? Number(verdict.doorDate.slice(-2)) : undefined)}
          style={{
            width: "100%", textAlign: "left", marginTop: 12, background: "rgba(143,182,216,.09)",
            borderLeft: "3px solid var(--gold)", borderRadius: 9, padding: "10px 12px", cursor: "pointer",
            fontSize: 12.5, color: "#dbe6f2", lineHeight: 1.55,
          }}
        >
          ▸ 想动的，先去日历看看<b style={{ color: "var(--gold-soft)", textDecoration: "underline", textUnderlineOffset: 3 }}>今天为什么慎</b>——看明白了，再决定。
        </button>
        {chip(true, "慎", "钱上先按住手", "var(--cream-dim)", "#c2baa6")}
      </div>
    );
  }

  // ── 平淡 · 天清（多数日）——先歇 + 备战糖，不空屏 ──
  return (
    <div
      data-testid="today-card"
      style={{
        borderRadius: 17, padding: "15px 16px", marginBottom: 12,
        border: "1px solid rgba(122,129,148,.3)", background: "var(--field)",
      }}
    >
      <div style={{ ...TAG, color: "var(--mute)" }}>
        <span style={DOT("var(--mute)")} aria-hidden="true" />今天 · 天清
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.4, marginBottom: 7, color: "var(--cream)" }}>{verdict.line}</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15.5, lineHeight: 1.5, color: "var(--cream-dim)" }}>{verdict.quote}</div>
      {/* 备战糖：平淡日不留白——给一件今天能铺垫的小事 */}
      {verdict.prep && (
        <div data-testid="today-prep" style={{ marginTop: 12, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.22)", borderRadius: 11, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55, color: "#dccfa6" }}>
          ▸ {verdict.prep}
        </div>
      )}
      {chip(true, "平", "钱上没大事", "var(--cream-dim)", "#c2baa6")}
    </div>
  );
}
