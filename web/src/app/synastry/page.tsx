"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { track } from "@/lib/track";

const TYPES: { id: RelType; ic: string; t: string; sub: string }[] = [
  { id: "lover", ic: "💞", t: "恋人 / 暧昧", sub: "合不合、爱不爱、走不走得下去" },
  { id: "partner", ic: "🤝", t: "合伙搞事业", sub: "能不能一起赚钱、谁主导、合不合财" },
  { id: "colleague", ic: "💼", t: "共事 / 同事", sub: "配不配合、会不会互相内耗" },
  { id: "friend", ic: "👯", t: "朋友", sub: "交不交心、处不处得久" },
  { id: "family", ic: "👩‍👧", t: "家人", sub: "懂不懂彼此、能不能和解" },
];
const DIM_COLOR = ["#e69ec8", "#f0a868", "#8fb6d8", "#e0c98a", "#7fc99a"];
// 合盘卡用的短关系名（结果页用全名「恋人 / 暧昧」，卡片要简洁「恋人盘」）。
const SHORT_REL: Record<RelType, string> = { lover: "恋人", partner: "合伙", colleague: "共事", friend: "朋友", family: "家人" };

// 下钻用：星体中文 + 相位角中文。来自引擎 Unit A 暴露的真实跨盘相位（不编造）。
const ZH: Record<string, string> = { Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星" };
const ANGLE_ZH: Record<number, string> = { 0: "合", 60: "六合", 90: "刑", 120: "拱", 180: "冲" };

// Sample partner — shown (labeled) until a real partner fills in the invite.
const DEMO_PARTNER = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

export default function SynastryPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const [type, setType] = useState<RelType | null>(null);

  const [realPartner, setRealPartner] = useState<Chart | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Restore every previously-created invite token on mount (newest is active).
  useEffect(() => {
    const list = readTokens();
    if (list.length) {
      setTokens(list);
      setInviteUrl(`${window.location.origin}/synastry/invite/${list[list.length - 1]}`);
    }
  }, []);

  // Poll all pending invites until any partner fills theirs in. Re-runs whenever
  // a new token is added. Revisiting the screen re-polls (B2 catch-up).
  useEffect(() => {
    if (!tokens.length || realPartner) return;
    let stop = false;
    const poll = async () => {
      for (const tk of tokens) {
        try {
          const r = await fetch(`/api/synastry/invite?token=${tk}`);
          if (!r.ok) continue;
          const j = await r.json();
          // Defense-in-depth: only accept a structurally valid partner chart, so
          // a legacy/corrupt KV entry never crashes synastry() on .placements.
          if (j.ready && isFullChart(j.partner?.chart)) {
            setRealPartner(j.partner.chart as Chart);
            setPartnerName(j.partner.name ?? "对方");
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
  }, [tokens, realPartner]);

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
        await nav.share({ title: "Molly 合盘", text: "来和我测测我俩合不合 · Molly", url: inviteUrl });
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
  if (!ready || !chart) return null;

  return (
    <main className="phone" data-testid="synastry">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>合盘</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 8px" }}>
        <BackButton onClick={() => (type ? setType(null) : router.back())} />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>合盘</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 24px 18px" }}>
        {!result ? (
          <>
            <div style={{ fontFamily: "var(--serif)", fontSize: 27, color: "var(--cream)", fontWeight: 500, margin: "10px 2px 5px" }}>你想看你俩，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>哪一种「合」？</span></div>
            <div style={{ fontSize: 13, color: "var(--mute)", margin: "0 2px 14px" }}>选不同关系，我看的维度也不同</div>

            {/* Invite panel — connect a real partner, or fall back to sample data */}
            {realPartner ? (
              <div data-testid="syn-partner-real" style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(127,201,154,.1)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 12, padding: "10px 13px", marginBottom: 16, fontSize: 12.5, color: "var(--green)" }}>
                ✓ 已连接 <b style={{ color: "var(--cream)" }}>{partnerName}</b> · 下面是你俩的真实合盘
              </div>
            ) : (
              <div style={{ background: "rgba(143,182,216,.06)", border: "1px solid rgba(143,182,216,.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--cream)", marginBottom: 3 }}>想测<b style={{ color: "var(--gold-soft)" }}>真实</b>合盘？</div>
                <div style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.6, marginBottom: 10 }}>下面的分数只是<b style={{ color: "var(--cream-dim)" }}>示例</b>。发个链接给 TA，填好出生信息就自动变成你俩的真盘。{inviteUrl ? "发出去后可以先去别处逛逛，TA 一填好这里就会自动更新。" : ""}</div>
                {inviteUrl ? (
                  <div>
                    {/* Waiting state (Unit E): the link is out, no partner yet — show a live pulse so it doesn't feel like a dead silent poll. */}
                    <div data-testid="syn-waiting" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--gold-soft)", marginBottom: 8 }}>
                      <span className="think-dot" /><span className="think-dot" style={{ animationDelay: ".18s" }} /><span className="think-dot" style={{ animationDelay: ".36s" }} />
                      <span style={{ color: "var(--cream-dim)" }}>等 TA 填好，这里就自动出你俩的真盘</span>
                    </div>
                    <div data-testid="syn-invite-url" style={{ fontSize: 11, color: "var(--gold-soft)", wordBreak: "break-all", background: "#0d1018", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>{inviteUrl}</div>
                    {/* 显眼发链接 (Unit F): share is the primary viral action; copy/regenerate are secondary. */}
                    <button data-testid="syn-share" onClick={shareLink} style={{ width: "100%", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 9, padding: "10px 0", fontSize: 13.5, cursor: "pointer", marginBottom: 8 }}>📤 发给 TA</button>
                    <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                      <button onClick={createInvite} style={{ flex: 1, background: "transparent", border: "1px solid var(--field-bd)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>重新生成</button>
                      <button data-testid="syn-copy" onClick={() => { navigator.clipboard?.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }} style={{ flex: 1, background: "transparent", border: "1px solid var(--field-bd)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{copied ? "已复制 ✓" : "复制链接"}</button>
                    </div>
                  </div>
                ) : (
                  <button data-testid="syn-invite-btn" onClick={createInvite} disabled={creating} style={{ width: "100%", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 9, padding: "9px 0", fontSize: 13, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>{creating ? "生成中…" : "邀请 TA 测真实合盘"}</button>
                )}
              </div>
            )}
            {TYPES.map((t) => (
              <button key={t.id} data-testid="syn-type" onClick={() => setType(t.id)} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, padding: "14px 15px", marginBottom: 10, cursor: "pointer" }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flex: "0 0 auto", background: "#161b29" }}>{t.ic}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, color: "var(--cream)", marginBottom: 2 }}>{t.t}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--mute)" }}>{t.sub}</span>
                </span>
                <span style={{ color: "#4f5666" }}>›</span>
              </button>
            ))}
          </>
        ) : (
          <Result result={result} demo={!realPartner} onConnect={() => setType(null)} selfChart={chart} partnerChart={realPartner} partnerName={partnerName} selfName={nickname} />
        )}
      </div>
    </main>
  );
}

function Result({ result, demo, onConnect, selfChart, partnerChart, partnerName, selfName }: { result: SynResult; demo: boolean; onConnect: () => void; selfChart: Chart; partnerChart: Chart | null; partnerName: string | null; selfName?: string }) {
  const typeLabel = TYPES.find((t) => t.id === result.type)!.t;
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
          <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--cream)", lineHeight: 1.5 }}>邀 TA 填好出生信息，<br />才能算你俩在「{typeLabel}」上的<b style={{ color: "var(--gold-soft)" }}>真实契合度</b>。</div>
          <div style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6 }}>到时我会逐项给你俩看这几面——</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {result.dims.map((d) => (
              <span key={d.key} style={{ fontSize: 12.5, color: "var(--cream-dim)", border: "1px solid var(--field-bd)", borderRadius: 999, padding: "5px 12px" }}>{d.label}</span>
            ))}
          </div>
          <button type="button" onClick={onConnect} style={{ marginTop: 4, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 10, padding: "11px 0", fontSize: 14, cursor: "pointer" }}>邀 TA 解锁你俩的真实合盘 →</button>
        </div>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 10, color: "#566073" }}>说的是相处动态，不是命定结局 · 怎么走你们说了算</div>
      </div>
    );
  }
  const who = partnerName ?? "对方";
  return (
    <div data-testid="syn-result">
      {/* 总分（点名两人）→ 维度条（可下钻）→ 解读  (D4 顺序) */}
      <div style={{ textAlign: "center", margin: "6px 0 4px" }}>
        <div data-testid="syn-names" style={{ fontFamily: "var(--serif)", fontSize: 21, color: "var(--cream)", fontWeight: 500 }}>你 <span style={{ color: "var(--gold-deep)" }}>↔</span> <b style={{ color: "var(--gold-soft)" }}>{who}</b></div>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", margin: "6px 0 2px" }}>{typeLabel} · 契合度</div>
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
                <span style={{ fontSize: 12.5, color: "var(--cream-dim)" }}>{d.label} <span style={{ fontSize: 10, color: "var(--mute)" }}>{open ? "收起 ⌃" : "看星位 ⌄"}</span></span>
                <b style={{ fontSize: 12.5, color }}>{d.value}</b>
              </button>
              <div style={{ height: 7, background: "#1b2130", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${d.value}%`, background: color }} /></div>
              {open && (
                <div data-testid="syn-drill" style={{ marginTop: 9, background: "#0d1119", border: "1px solid #20283a", borderRadius: 11, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {d.aspects.length ? (
                    d.aspects.map((x, j) => (
                      <div key={j} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12, color: "var(--cream-dim)" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, flex: "0 0 auto", color: x.kind === "harmony" ? "var(--green)" : "var(--orange)", background: x.kind === "harmony" ? "rgba(127,201,154,.12)" : "rgba(240,168,104,.12)" }}>{ANGLE_ZH[x.angle] ?? `${x.angle}°`}</span>
                        <span>你的<b style={{ color: "var(--cream)" }}>{ZH[x.a] ?? x.a}</b> — {who}的<b style={{ color: "var(--cream)" }}>{ZH[x.b] ?? x.b}</b></span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--mute)" }}>这个维度你俩没有显著相位——不强也不冲，平平。</div>
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

      <button type="button" data-testid="syn-card-open" onClick={() => setShowCard(true)} style={{ display: "block", width: "100%", margin: "22px 0 6px", textAlign: "center", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这份合盘存成卡</button>
      <div style={{ marginTop: 0, textAlign: "center", fontSize: 10, color: "#566073" }}>说的是相处动态，不是命定结局 · 怎么走你们说了算</div>

      {showCard && (
        <SynCard pair={`你 ↔ ${who}`} relLabel={`${SHORT_REL[result.type]}盘`} total={result.total} quote={read.catchLine} onClose={() => setShowCard(false)} />
      )}
    </div>
  );
}

const TPLS: Template[] = ["a", "b", "c", "d"];

// 合盘卡 overlay (Unit F): real pairing only (rendered inside the non-demo Result,
// so §8.3 holds — no card for a fake score). Mirrors /share export: SVG on screen,
// rasterized to PNG for native share / download.
function SynCard({ pair, relLabel, total, quote, onClose }: { pair: string; relLabel: string; total: number; quote: string; onClose: () => void }) {
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
      const file = new File([blob], "molly-synastry.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      track("syn_card_share", { tpl });
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], text: "我俩的合盘 · Molly" });
        setToast("已唤起分享");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "molly-synastry.png";
        a.click();
        URL.revokeObjectURL(url);
        setToast("已保存图片 ✓");
      }
    } catch {
      setToast("生成失败，再试一次");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="syn-card" role="dialog" aria-modal="true" aria-label="合盘卡" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(4,5,10,.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 265, maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
        {TPLS.map((t) => (
          <button key={t} type="button" aria-label={`模板 ${t.toUpperCase()}`} onClick={() => setTpl(t)} style={{ width: 26, height: 26, borderRadius: 999, border: t === tpl ? "1px solid var(--gold)" : "1px solid var(--field-bd)", background: "transparent", color: t === tpl ? "var(--gold-soft)" : "var(--cream-dim)", fontSize: 11, cursor: "pointer" }}>{t.toUpperCase()}</button>
        ))}
      </div>
      <button type="button" data-testid="syn-card-export" onClick={(e) => { e.stopPropagation(); exportPng(); }} disabled={busy} className="gold-btn" style={{ maxWidth: 265, opacity: busy ? 0.7 : 1 }}>{busy ? "生成中…" : "📤 分享 / 保存图片"}</button>
      <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--cream-dim)", fontSize: 13, cursor: "pointer" }}>关闭</button>
      {toast && <div style={{ fontSize: 12, color: "var(--gold-soft)" }}>{toast}</div>}
    </div>
  );
}
