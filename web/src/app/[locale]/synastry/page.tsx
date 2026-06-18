"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useChartGuard } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { computeChart, type Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { synastry, type RelType, type SynResult } from "@/lib/astro/synastry";
import { synScaffold, type SynRead } from "@/lib/reading/synastry";
import { fetchSynastryRead } from "@/lib/reading/remote";
import { buildSynastryCardSVG, svgToPngBlob, type Template } from "@/lib/share/card";
import { useFunnel } from "@/lib/store";
import { readTokens, addStoredToken } from "@/lib/synastryTokens";
import { readPartners, upsertPartner, removePartner, type SavedPartner } from "@/lib/synastryPartners";
import { track } from "@/lib/track";
import { PLANETS, ASPECTS } from "@/i18n/glossary";

const TYPE_META: { id: RelType; ic: string }[] = [
  { id: "lover", ic: "💞" },
  { id: "partner", ic: "🤝" },
  { id: "colleague", ic: "💼" },
  { id: "friend", ic: "👯" },
  { id: "family", ic: "👩‍👧" },
];
const DIM_COLOR = ["#e69ec8", "#f0a868", "#8fb6d8", "#e0c98a", "#7fc99a"];

// 下钻用：星体名 + 相位角名。来自引擎 Unit A 暴露的真实跨盘相位（不编造）；
// 名称从共享术语表按当前 locale 取（PLANETS/ASPECTS），不在 UI 层硬编中文。
const ANGLE_ASPECT: Record<number, keyof typeof ASPECTS> = { 0: "conjunction", 60: "sextile", 90: "square", 120: "trine", 180: "opposition" };

// Sample partner — shown (labeled) until a real partner fills in the invite.
const DEMO_PARTNER = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

export default function SynastryPage() {
  const t = useTranslations("synastry");
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const [type, setType] = useState<RelType | null>(null);

  const [realPartner, setRealPartner] = useState<Chart | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [connectedToken, setConnectedToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [partners, setPartners] = useState<SavedPartner[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Restore every previously-created invite token + saved partners on mount.
  useEffect(() => {
    const list = readTokens();
    if (list.length) {
      setTokens(list);
      setInviteUrl(`${window.location.origin}/synastry/invite/${list[list.length - 1]}`);
    }
    setPartners(readPartners());
  }, []);

  // Poll all pending invites until any partner fills theirs in. Re-runs whenever
  // a new token is added. Revisiting the screen re-polls (B2 catch-up).
  useEffect(() => {
    if (!tokens.length || realPartner) return;
    // Skip invites whose partner is already saved (已合的人) — otherwise 再合一个人
    // would immediately auto-reconnect the person you just left. Re-open them
    // explicitly from the saved list instead.
    const saved = new Set(partners.map((p) => p.token));
    const pending = tokens.filter((t) => !saved.has(t));
    if (!pending.length) return;
    let stop = false;
    const poll = async () => {
      for (const tk of pending) {
        try {
          const r = await fetch(`/api/synastry/invite?token=${tk}`);
          if (!r.ok) continue;
          const j = await r.json();
          // Defense-in-depth: only accept a structurally valid partner chart, so
          // a legacy/corrupt KV entry never crashes synastry() on .placements.
          if (j.ready && isFullChart(j.partner?.chart)) {
            const nm = j.partner.name ?? t("fallbackPartner");
            setRealPartner(j.partner.chart as Chart);
            setPartnerName(nm);
            setConnectedToken(tk);
            // remember this connection in 已合的人 (Unit G); type/total added on view
            setPartners(upsertPartner({ token: tk, name: nm, chart: j.partner.chart }));
            stop = true;
            return;
          }
        } catch {
          /* ignore */
        }
      }
    };
    poll();
    const iv = setInterval(() => {
      if (stop) clearInterval(iv);
      else poll();
    }, 4000);
    return () => clearInterval(iv);
  }, [tokens, realPartner, partners]);

  async function createInvite() {
    if (creating) return;
    setCreating(true);
    try {
      // Carry A's derived chart + the chosen relationship type so person B can
      // see the synastry and the landing page can name the relationship (PR1.5/D3).
      const r = await fetch("/api/synastry/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviterName: nickname, inviterChart: chart, type: type ?? undefined }),
      });
      const { token: t } = await r.json();
      setTokens(addStoredToken(t)); // kicks off polling, keeps prior invites
      const url = `${window.location.origin}/synastry/invite/${t}`;
      setInviteUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard may be blocked; link is shown for manual copy */
      }
    } finally {
      setCreating(false);
    }
  }

  // 显眼发链接 (Unit F): native share sheet on mobile (the real viral action),
  // graceful copy fallback on desktop / where Web Share is unavailable.
  async function shareLink() {
    if (!inviteUrl) return;
    track("syn_invite_share");
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: t("shareTitle"), text: t("shareText"), url: inviteUrl });
        return;
      } catch {
        /* user cancelled or share failed → fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* link is shown for manual copy */
    }
  }

  const partner = realPartner ?? DEMO_PARTNER;
  const result = useMemo(() => (chart && type ? synastry(chart, partner, type) : null), [chart, type, partner]);

  // Record the last relationship type + score A viewed for this partner, so the
  // 已合的人 list can show it (Unit G / D7). Real pairings only.
  useEffect(() => {
    if (!result || !realPartner || !connectedToken) return;
    setPartners(upsertPartner({ token: connectedToken, name: partnerName ?? t("fallbackPartner"), chart: realPartner, type: result.type, total: result.total }));
  }, [result, realPartner, connectedToken, partnerName]);

  // 再合一个人: drop the current partner, return to the invite/entry screen to
  // bring in someone new. Saved partners stay in 已合的人.
  function recouple() {
    setType(null);
    setRealPartner(null);
    setPartnerName(null);
    setConnectedToken(null);
  }
  // Re-open a saved partner: load their derived chart, go pick a type.
  function openSaved(p: SavedPartner) {
    if (!isFullChart(p.chart)) return;
    setRealPartner(p.chart as Chart);
    setPartnerName(p.name);
    setConnectedToken(p.token);
    setType(null);
  }
  function deleteSaved(token: string) {
    setPartners(removePartner(token));
  }

  if (!ready || !chart) return null;

  return (
    <main className="phone" data-testid="synastry">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 8px" }}>
        <BackButton onClick={() => (type ? setType(null) : router.back())} />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>{t("header")}</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 24px 18px" }}>
        {!result ? (
          <>
            <div style={{ fontFamily: "var(--serif)", fontSize: 27, color: "var(--cream)", fontWeight: 500, margin: "10px 2px 5px" }}>{t("pickHeadingBefore")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("pickHeadingEmphasis")}</span></div>
            <div style={{ fontSize: 13, color: "var(--mute)", margin: "0 2px 14px" }}>{t("pickHeadingSub")}</div>

            {/* Invite panel — connect a real partner, or fall back to sample data */}
            {realPartner ? (
              <div data-testid="syn-partner-real" style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(127,201,154,.1)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 12, padding: "10px 13px", marginBottom: 16, fontSize: 12.5, color: "var(--green)" }}>
                {t("connectedBefore")}<b style={{ color: "var(--cream)" }}>{partnerName}</b>{t("connectedAfter")}
              </div>
            ) : (
              <div style={{ background: "rgba(143,182,216,.06)", border: "1px solid rgba(143,182,216,.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--cream)", marginBottom: 3 }}>{t("wantRealBefore")}<b style={{ color: "var(--gold-soft)" }}>{t("wantRealEmphasis")}</b>{t("wantRealAfter")}</div>
                <div style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.6, marginBottom: 10 }}>{t("sampleNoteBefore")}<b style={{ color: "var(--cream-dim)" }}>{t("sampleNoteEmphasis")}</b>{t("sampleNoteAfter")}{inviteUrl ? t("sampleNoteSent") : ""}</div>
                {inviteUrl ? (
                  <div>
                    {/* Waiting state (Unit E): the link is out, no partner yet — show a live pulse so it doesn't feel like a dead silent poll. */}
                    <div data-testid="syn-waiting" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--gold-soft)", marginBottom: 8 }}>
                      <span className="think-dot" /><span className="think-dot" style={{ animationDelay: ".18s" }} /><span className="think-dot" style={{ animationDelay: ".36s" }} />
                      <span style={{ color: "var(--cream-dim)" }}>{t("waitingHint")}</span>
                    </div>
                    <div data-testid="syn-invite-url" style={{ fontSize: 11, color: "var(--gold-soft)", wordBreak: "break-all", background: "#0d1018", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>{inviteUrl}</div>
                    {/* 显眼发链接 (Unit F): share is the primary viral action; copy/regenerate are secondary. */}
                    <button data-testid="syn-share" onClick={shareLink} style={{ width: "100%", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 9, padding: "10px 0", fontSize: 13.5, cursor: "pointer", marginBottom: 8 }}>{t("shareBtn")}</button>
                    <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                      <button onClick={createInvite} style={{ flex: 1, background: "transparent", border: "1px solid var(--field-bd)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{t("regenerateBtn")}</button>
                      <button data-testid="syn-copy" onClick={() => { navigator.clipboard?.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }} style={{ flex: 1, background: "transparent", border: "1px solid var(--field-bd)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{copied ? t("copiedBtn") : t("copyBtn")}</button>
                    </div>
                  </div>
                ) : (
                  <button data-testid="syn-invite-btn" onClick={createInvite} disabled={creating} style={{ width: "100%", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 9, padding: "9px 0", fontSize: 13, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>{creating ? t("creating") : t("inviteBtn")}</button>
                )}
              </div>
            )}
            {TYPE_META.map((m) => (
              <button key={m.id} data-testid="syn-type" onClick={() => setType(m.id)} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, padding: "14px 15px", marginBottom: 10, cursor: "pointer" }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flex: "0 0 auto", background: "#161b29" }}>{m.ic}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, color: "var(--cream)", marginBottom: 2 }}>{t(`types.${m.id}.title`)}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--mute)" }}>{t(`types.${m.id}.sub`)}</span>
                </span>
                <span style={{ color: "#4f5666" }}>›</span>
              </button>
            ))}

            {/* 已合的人 (Unit G): re-open or remove past pairings. Score shown (D7). */}
            {partners.length > 0 && (
              <div data-testid="syn-saved" style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mute)", margin: "0 2px 10px" }}>{t("savedHeading")}</div>
                {[...partners].reverse().map((p) => (
                  <div key={p.token} style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 13, padding: "10px 13px", marginBottom: 9 }}>
                    <button type="button" data-testid="syn-saved-open" onClick={() => openSaved(p)} style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                      <span style={{ width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 50% 40%,#2a2160,#0a0e1a)", boxShadow: "0 0 0 1px var(--gold-deep)", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--gold-soft)" }}>{p.name.slice(0, 1)}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontSize: 14, color: "var(--cream)" }}>{p.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: "var(--mute)" }}>{p.type && typeof p.total === "number" ? t("savedScore", { rel: t(`shortRel.${p.type}`) + t("relCardSuffix"), total: p.total }) : t("savedTapToTest")}</span>
                      </span>
                    </button>
                    <button type="button" aria-label={t("savedDeleteAria", { name: p.name })} onClick={() => deleteSaved(p.token)} style={{ background: "none", border: "none", fontSize: 11, color: "#5a6275", cursor: "pointer", padding: "4px 6px" }}>{t("savedDelete")}</button>
                  </div>
                ))}
                <div style={{ textAlign: "center", fontSize: 10, color: "#566073", marginTop: 2 }}>{t("savedDeleteNote")}</div>
              </div>
            )}
          </>
        ) : (
          <Result result={result} demo={!realPartner} onConnect={() => { if (!inviteUrl) createInvite(); setType(null); }} onRecouple={recouple} selfChart={chart} partnerChart={realPartner} partnerName={partnerName} selfName={nickname} />
        )}
      </div>
    </main>
  );
}

function Result({ result, demo, onConnect, onRecouple, selfChart, partnerChart, partnerName, selfName }: { result: SynResult; demo: boolean; onConnect: () => void; onRecouple: () => void; selfChart: Chart; partnerChart: Chart | null; partnerName: string | null; selfName?: string }) {
  const t = useTranslations("synastry");
  const locale = useLocale() as "zh" | "ru";
  const typeLabel = t(`types.${result.type}.title`);
  const [read, setRead] = useState<SynRead>(() => synScaffold(result, selfName ?? undefined, partnerName ?? undefined));
  const [openDim, setOpenDim] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  // Re-seed the deterministic scaffold whenever the pairing/type changes.
  useEffect(() => {
    setRead(synScaffold(result, selfName ?? undefined, partnerName ?? undefined));
    setOpenDim(null);
  }, [result, selfName, partnerName]);

  // Progressive upgrade (real partner only): render the instant scaffold, then
  // swap in the LLM prose when it lands. Null → keep the per-type scaffold.
  useEffect(() => {
    if (demo || !partnerChart) return;
    let alive = true;
    fetchSynastryRead(selfChart, partnerChart, result.type, selfName ?? undefined, partnerName ?? undefined).then((r) => {
      if (alive && r) setRead(r);
    });
    return () => {
      alive = false;
    };
  }, [demo, selfChart, partnerChart, result.type, selfName, partnerName]);

  // 强卡口（R4 / 宪法 §8.3 不误导）：没有真实 partner 时，绝不给任何契合度分数
  // 或解读——连模糊的假分都不给，杜绝被当真实结果截图分享。只展示「这个关系会
  // 测哪些面」(维度名、不带分值) 当裂变钩子，并引导去邀请对方。
  if (demo) {
    return (
      <div data-testid="syn-result">
        <div data-testid="syn-demo-banner" style={{ display: "flex", flexDirection: "column", gap: 12, background: "rgba(143,182,216,.08)", border: "1px solid rgba(143,182,216,.28)", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--cream)", lineHeight: 1.5 }}>{t("demo.headingBefore")}<br />{t("demo.headingMid", { typeLabel })}<b style={{ color: "var(--gold-soft)" }}>{t("demo.headingEmphasis")}</b>{t("demo.headingAfter")}</div>
          <div style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6 }}>{t("demo.dimsIntro")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {result.dims.map((d) => (
              <span key={d.key} style={{ fontSize: 12.5, color: "var(--cream-dim)", border: "1px solid var(--field-bd)", borderRadius: 999, padding: "5px 12px" }}>{d.label}</span>
            ))}
          </div>
          <button type="button" onClick={onConnect} style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 10, padding: "11px 0", fontSize: 14, cursor: "pointer" }}>{t("demo.unlockBtn")}</button>
        </div>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 10, color: "#566073" }}>{t("demo.disclaimer")}</div>
      </div>
    );
  }
  const who = partnerName ?? t("fallbackPartner");
  return (
    <div data-testid="syn-result">
      {/* 总分（点名两人）→ 维度条（可下钻）→ 解读  (D4 顺序) */}
      <div style={{ textAlign: "center", margin: "6px 0 4px" }}>
        <div data-testid="syn-names" style={{ fontFamily: "var(--serif)", fontSize: 21, color: "var(--cream)", fontWeight: 500 }}>{t("result.names")} <span style={{ color: "var(--gold-deep)" }}>{t("result.namesArrow")}</span> <b style={{ color: "var(--gold-soft)" }}>{who}</b></div>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", margin: "6px 0 2px" }}>{typeLabel} · {t("result.compatibility")}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 600, color: "var(--gold)", lineHeight: 1, textShadow: "0 0 30px rgba(201,168,97,.3)" }}>{result.total}<small style={{ fontSize: 22 }}>%</small></div>
        <div style={{ marginTop: 7, fontSize: 12.5, color: "var(--green)" }}>{read.vibe}</div>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {result.dims.map((d, i) => {
          const open = openDim === d.key;
          const color = DIM_COLOR[i % DIM_COLOR.length];
          return (
            <div key={d.key}>
              <button type="button" data-testid="syn-dim" onClick={() => setOpenDim(open ? null : d.key)} aria-expanded={open} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: 0, marginBottom: 5, cursor: "pointer" }}>
                <span style={{ fontSize: 12.5, color: "var(--cream-dim)" }}>{d.label} <span style={{ fontSize: 10, color: "var(--mute)" }}>{open ? t("drill.open") : t("drill.closed")}</span></span>
                <b style={{ fontSize: 12.5, color }}>{d.value}</b>
              </button>
              <div style={{ height: 7, background: "#1b2130", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${d.value}%`, background: color }} /></div>
              {open && (
                <div data-testid="syn-drill" style={{ marginTop: 9, background: "#0d1119", border: "1px solid #20283a", borderRadius: 11, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {d.aspects.length ? (
                    d.aspects.map((x, j) => (
                      <div key={j} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12, color: "var(--cream-dim)" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, flex: "0 0 auto", color: x.kind === "harmony" ? "var(--green)" : "var(--orange)", background: x.kind === "harmony" ? "rgba(127,201,154,.12)" : "rgba(240,168,104,.12)" }}>{ANGLE_ASPECT[x.angle] ? ASPECTS[ANGLE_ASPECT[x.angle]][locale] : t("anglePlaceholder", { angle: x.angle })}</span>
                        <span>{t("drill.yourBody")}<b style={{ color: "var(--cream)" }}>{PLANETS[x.a]?.[locale] ?? x.a}</b>{t("drill.dash")}{t("drill.theirBody", { who })}<b style={{ color: "var(--cream)" }}>{PLANETS[x.b]?.[locale] ?? x.b}</b></span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--mute)" }}>{t("drill.noAspect")}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <p style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 18.5, lineHeight: 1.6, color: "var(--cream-dim)", marginBottom: 13 }}>{read.body}</p>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18.5, color: "var(--green)", borderLeft: "2px solid var(--green)", paddingLeft: 13 }}>{read.catchLine}</p>
      </div>

      <button type="button" data-testid="syn-card-open" onClick={() => setShowCard(true)} style={{ display: "block", width: "100%", margin: "22px 0 6px", textAlign: "center", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>{t("result.saveCardBtn")}</button>
      <button type="button" data-testid="syn-recouple" onClick={onRecouple} style={{ display: "block", width: "100%", margin: "2px 0 8px", textAlign: "center", fontSize: 12.5, color: "var(--cream-dim)", cursor: "pointer", background: "none", border: "none" }}>{t("result.recoupleBtn")}</button>
      <div style={{ marginTop: 0, textAlign: "center", fontSize: 10, color: "#566073" }}>{t("result.disclaimer")}</div>

      {showCard && (
        <SynCard pair={t("card.pair", { who })} relLabel={t(`shortRel.${result.type}`) + t("relCardSuffix")} total={result.total} quote={read.catchLine} onClose={() => setShowCard(false)} />
      )}
    </div>
  );
}

const TPLS: Template[] = ["a", "b", "c", "d"];

// 合盘卡 overlay (Unit F): real pairing only (rendered inside the non-demo Result,
// so §8.3 holds — no card for a fake score). Mirrors /share export: SVG on screen,
// rasterized to PNG for native share / download.
function SynCard({ pair, relLabel, total, quote, onClose }: { pair: string; relLabel: string; total: number; quote: string; onClose: () => void }) {
  const t = useTranslations("synastry");
  const [tpl, setTpl] = useState<Template>("a");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const data = { pair, relLabel, total, quote };
  const svg = buildSynastryCardSVG(data, tpl);

  async function exportPng() {
    if (busy) return;
    setBusy(true);
    try {
      const scale = 3;
      const out = buildSynastryCardSVG(data, tpl, { forExport: true, scale });
      const blob = await svgToPngBlob(out, 318 * scale, 424 * scale);
      const file = new File([blob], t("card.fileName"), { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      track("syn_card_share", { tpl });
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], text: t("card.shareText") });
        setToast(t("card.toastShared"));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = t("card.fileName");
        a.click();
        URL.revokeObjectURL(url);
        setToast(t("card.toastSaved"));
      }
    } catch {
      setToast(t("card.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="syn-card" role="dialog" aria-modal="true" aria-label={t("cardLabel")} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(4,5,10,.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 265, maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
        {TPLS.map((tp) => (
          <button key={tp} type="button" aria-label={t("card.templateAria", { tpl: tp.toUpperCase() })} onClick={() => setTpl(tp)} style={{ width: 26, height: 26, borderRadius: 999, border: tp === tpl ? "1px solid var(--gold)" : "1px solid var(--field-bd)", background: "transparent", color: tp === tpl ? "var(--gold-soft)" : "var(--cream-dim)", fontSize: 11, cursor: "pointer" }}>{tp.toUpperCase()}</button>
        ))}
      </div>
      <button type="button" data-testid="syn-card-export" onClick={(e) => { e.stopPropagation(); exportPng(); }} disabled={busy} className="gold-btn" style={{ maxWidth: 265, opacity: busy ? 0.7 : 1 }}>{busy ? t("card.exporting") : t("card.exportBtn")}</button>
      <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--cream-dim)", fontSize: 13, cursor: "pointer" }}>{t("card.closeBtn")}</button>
      {toast && <div style={{ fontSize: 12, color: "var(--gold-soft)" }}>{toast}</div>}
    </div>
  );
}
