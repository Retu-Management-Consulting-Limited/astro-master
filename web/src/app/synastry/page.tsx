"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChartGuard } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { computeChart, type Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { synastry, type RelType, type SynResult } from "@/lib/astro/synastry";
import { useFunnel } from "@/lib/store";
import { readTokens, addStoredToken } from "@/lib/synastryTokens";

const TYPES: { id: RelType; ic: string; t: string; sub: string }[] = [
  { id: "lover", ic: "💞", t: "恋人 / 暧昧", sub: "合不合、爱不爱、走不走得下去" },
  { id: "partner", ic: "🤝", t: "合伙搞事业", sub: "能不能一起赚钱、谁主导、合不合财" },
  { id: "colleague", ic: "💼", t: "共事 / 同事", sub: "配不配合、会不会互相内耗" },
  { id: "friend", ic: "👯", t: "朋友", sub: "交不交心、处不处得久" },
  { id: "family", ic: "👩‍👧", t: "家人", sub: "懂不懂彼此、能不能和解" },
];
const DIM_COLOR = ["#e69ec8", "#f0a868", "#8fb6d8", "#e0c98a", "#7fc99a"];

// Sample partner — shown (labeled) until a real partner fills in the invite.
const DEMO_PARTNER = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

function reading(r: SynResult): { vibe: string; body: string; catchLine: string } {
  const hi = [...r.dims].sort((a, b) => b.value - a.value)[0];
  const lo = [...r.dims].sort((a, b) => a.value - b.value)[0];
  const hn = hi.label.replace(/^[^一-龥]+/, "");
  const ln = lo.label.replace(/^[^一-龥]+/, "");
  return {
    vibe: `${hn}够强，但${ln}是你们的短板`,
    body: `你俩最稳的是「${hn}」——${hi.value} 分，这是你们的底气。可「${ln}」只有 ${lo.value}：${ln}不补上，时间久了会磨。`,
    catchLine: `不是不合适，是你们得有一个人，先在「${ln}」上松口。`,
  };
}

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
      const r = await fetch("/api/synastry/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviterName: nickname }),
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
                    <div data-testid="syn-invite-url" style={{ fontSize: 11, color: "var(--gold-soft)", wordBreak: "break-all", background: "#0d1018", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>{inviteUrl}</div>
                    <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                      <button onClick={createInvite} style={{ flex: "0 0 auto", background: "transparent", border: "1px solid var(--field-bd)", color: "var(--cream-dim)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>重新生成</button>
                      <button data-testid="syn-copy" onClick={() => { navigator.clipboard?.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }} style={{ flex: 1, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{copied ? "已复制 ✓" : "复制链接"}</button>
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
          <Result result={result} demo={!realPartner} onConnect={() => setType(null)} />
        )}
      </div>
    </main>
  );
}

function Result({ result, demo, onConnect }: { result: SynResult; demo: boolean; onConnect: () => void }) {
  const router = useRouter();
  const r = reading(result);
  const typeLabel = TYPES.find((t) => t.id === result.type)!.t;
  // When showing sample data (no real partner yet), the score/dims/reading are
  // fabricated — blur them and overlay a connect CTA so a casual user never
  // reads a fake 78% as their real compatibility (B3 / R4).
  const veil: React.CSSProperties = demo
    ? { filter: "blur(6px)", opacity: 0.5, userSelect: "none", pointerEvents: "none" }
    : {};
  return (
    <div data-testid="syn-result">
      {demo && (
        <div data-testid="syn-demo-banner" style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(143,182,216,.08)", border: "1px solid rgba(143,182,216,.28)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 12.5, color: "var(--cream-dim)", lineHeight: 1.6 }}>下面是<b style={{ color: "var(--cream)" }}>示例</b>分数，不是你俩的真实结果。</div>
          <button type="button" onClick={onConnect} style={{ background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", border: "none", color: "#1a1408", fontWeight: 600, borderRadius: 9, padding: "9px 0", fontSize: 13, cursor: "pointer" }}>邀 TA 解锁你俩的真实合盘 →</button>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div aria-hidden={demo || undefined} style={veil}>
          <div style={{ textAlign: "center", margin: "6px 0 4px" }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 3 }}>{typeLabel} · 契合度</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 58, fontWeight: 600, color: "var(--gold)", lineHeight: 1, textShadow: "0 0 30px rgba(201,168,97,.3)" }}>{result.total}<small style={{ fontSize: 22 }}>%</small></div>
            <div style={{ marginTop: 7, fontSize: 12.5, color: "var(--green)" }}>{r.vibe}</div>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {result.dims.map((d, i) => (
              <div key={d.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 5 }}><span>{d.label}</span><b style={{ color: DIM_COLOR[i % DIM_COLOR.length] }}>{d.value}</b></div>
                <div style={{ height: 7, background: "#1b2130", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${d.value}%`, background: DIM_COLOR[i % DIM_COLOR.length] }} /></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <p style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 18.5, lineHeight: 1.6, color: "var(--cream-dim)", marginBottom: 13 }}>{r.body}</p>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18.5, color: "var(--green)", borderLeft: "2px solid var(--green)", paddingLeft: 13 }}>{r.catchLine}</p>
          </div>
        </div>
      </div>
      {!demo && (
        <button type="button" onClick={() => router.push("/share")} style={{ display: "block", width: "100%", margin: "22px 0 6px", textAlign: "center", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这份合盘存成卡</button>
      )}
      <div style={{ marginTop: demo ? 14 : 0, textAlign: "center", fontSize: 10, color: "#566073" }}>说的是相处动态，不是命定结局 · 怎么走你们说了算</div>
    </div>
  );
}
