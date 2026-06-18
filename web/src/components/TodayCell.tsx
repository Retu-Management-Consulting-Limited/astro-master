"use client";
import { useTranslations } from "next-intl";
import type { TodayVerdict, TodayState } from "@/lib/reading/todayVerdict";
import type { DailyReading } from "@/lib/reading/daily";

// 今日格 · 三态变身（design/20-today-cell-states.html）。
//
// 一张卡，按 todayVerdict.state 长成三副面孔，槽位严格对齐 charter 附录A：
//   • plain（天清/平淡，多数日）：先歇（赦免）+ 备战糖(prep)，不空屏 = 维生素天天响。
//   • red（慎，稀有·刹车）     ：命令叫停(line) + 内在why + 赦免糖(quote) + 前门(door→那天财运)。
//   • green（旺，稀有·勇气义肢）：命令出手(line) + 可晒"财运旺"badge(轻免责) + 落到可控动作(action)。
// 每一态都带「双 chip」（财运 + 身心，恒在，主导加亮）：财运 chip → /wealth、身心
// chip → /body（T4 Phase 3 · 两轨对称，谁响谁领头；都用同一套红/绿/平行动灯）。
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

// 三态 → 同一套红/绿/平行动灯（与财运 wealth 共用语义，身心不另起配色）。
// accent=状态点/文字主色，soft=label 的高亮色，bg/bd=chip 底/边（淡同色）。
const STATE_STYLE: Record<TodayState, { accent: string; soft: string; bg: string; bd: string }> = {
  red: { accent: "var(--red)", soft: "#f0b6ab", bg: "rgba(224,120,106,.08)", bd: "rgba(224,120,106,.3)" },
  green: { accent: "var(--green)", soft: "#a8e0bf", bg: "rgba(127,201,154,.08)", bd: "rgba(127,201,154,.3)" },
  plain: { accent: "var(--cream-dim)", soft: "#c2baa6", bg: "rgba(122,129,148,.08)", bd: "rgba(122,129,148,.28)" },
};
// 各轨 × 各态的短 label（说倾向、不诊断）走 messages（today.cell.moneyLabel /
// today.cell.bodyLabel），财运沿用旧词、身心安抚口吻；译文逐字保留。

export function TodayCell({
  verdict, daily, onWealth, onBody,
}: {
  verdict: TodayVerdict;
  daily: DailyReading;
  onWealth: (selDay?: number) => void;
  onBody: () => void;
}) {
  const t = useTranslations("today.cell");
  // 双 chip（财运 + 身心，恒在，主导加亮）→ 各进 /wealth 与 /body。两条都用与财运同一套
  // 红/绿/平语义着色（身心不另起 teal 配色，见 design/23）。主导那条(verdict.channel)
  // 加亮领头：data-lead='true' + 内描边(box-shadow inset) + 不透明；另一条略降透明。
  const moneyLead = verdict.channel === "钱"; // i18n-allow-cjk: C 区 Channel 枚举值比较，非 UI 文案
  const fortuneStyle = STATE_STYLE[verdict.state];
  const bodyStyle = STATE_STYLE[verdict.bodyState];

  const chips = () => (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
      <button
        type="button"
        data-testid="fortune-chip"
        data-lead={moneyLead ? "true" : "false"}
        onClick={() => onWealth(verdict.doorDate ? Number(verdict.doorDate.slice(-2)) : undefined)}
        style={{
          width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", borderRadius: 11, cursor: "pointer", fontSize: 12.5, color: fortuneStyle.accent,
          background: fortuneStyle.bg, border: `1px solid ${fortuneStyle.bd}`,
          boxShadow: moneyLead ? `inset 0 0 0 1px ${fortuneStyle.accent}` : "none",
          opacity: moneyLead ? 1 : 0.82,
        }}
      >
        <span data-testid="fortune-chip-dot" aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: fortuneStyle.accent, boxShadow: `0 0 8px ${fortuneStyle.accent}` }} />
        <span>{t("fortuneChipBefore")}<b style={{ color: fortuneStyle.soft }}>{t(`moneyLabel.${verdict.state}`)}</b>{t("fortuneChipAfter")}</span>
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>→</span>
      </button>
      <button
        type="button"
        data-testid="body-chip"
        data-lead={!moneyLead ? "true" : "false"}
        onClick={() => onBody()}
        style={{
          width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", borderRadius: 11, cursor: "pointer", fontSize: 12.5, color: bodyStyle.accent,
          background: bodyStyle.bg, border: `1px solid ${bodyStyle.bd}`,
          boxShadow: !moneyLead ? `inset 0 0 0 1px ${bodyStyle.accent}` : "none",
          opacity: !moneyLead ? 1 : 0.82,
        }}
      >
        <span data-testid="body-chip-dot" aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: bodyStyle.accent, boxShadow: `0 0 8px ${bodyStyle.accent}` }} />
        <span>{t("bodyChipBefore")}<b style={{ color: bodyStyle.soft }}>{t(`bodyLabel.${verdict.bodyState}`)}</b>{t("bodyChipAfter")}</span>
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>→</span>
      </button>
    </div>
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
          <span style={DOT("var(--green)", true)} aria-hidden="true" />{t("greenTag")}
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 9 }}>
          <span data-testid="today-wang-badge" style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#1a1206",
            background: "linear-gradient(90deg,var(--gold-soft),var(--gold))", padding: "3px 9px", borderRadius: 20, fontWeight: 600,
          }}>{t("wangBadge")}</span>
          <span style={{ fontSize: 11, color: "var(--gold-deep)" }}>{t("wangCaveat")}</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: "#b6e8c8" }}>{verdict.line}</div>
        <div style={{ marginTop: 9, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16.5, lineHeight: 1.5, color: "var(--gold-soft)" }}>{verdict.quote}</div>
        {verdict.action && (
          <div data-testid="today-action" style={{ marginTop: 12, background: "rgba(127,201,154,.1)", borderLeft: "3px solid var(--green)", borderRadius: 9, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55, color: "#def0e6" }}>
            ▸ {verdict.action}
          </div>
        )}
        {chips()}
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
          <span style={DOT("var(--red)", true)} aria-hidden="true" />{t("redTag")}
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
          {t("redDoorBefore")}<b style={{ color: "var(--gold-soft)", textDecoration: "underline", textUnderlineOffset: 3 }}>{t("redDoorEmphasis")}</b>{t("redDoorAfter")}
        </button>
        {chips()}
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
        <span style={DOT("var(--mute)")} aria-hidden="true" />{t("plainTag")}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.4, marginBottom: 7, color: "var(--cream)" }}>{verdict.line}</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15.5, lineHeight: 1.5, color: "var(--cream-dim)" }}>{verdict.quote}</div>
      {/* 备战糖：平淡日不留白——给一件今天能铺垫的小事 */}
      {verdict.prep && (
        <div data-testid="today-prep" style={{ marginTop: 12, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.22)", borderRadius: 11, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55, color: "#dccfa6" }}>
          ▸ {verdict.prep}
        </div>
      )}
      {chips()}
    </div>
  );
}
