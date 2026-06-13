"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { computeChart } from "@/lib/astro/chart";
import { synastry, type RelType, type SynResult } from "@/lib/astro/synastry";

const TYPES: { id: RelType; ic: string; t: string; sub: string }[] = [
  { id: "lover", ic: "💞", t: "恋人 / 暧昧", sub: "合不合、爱不爱、走不走得下去" },
  { id: "partner", ic: "🤝", t: "合伙搞事业", sub: "能不能一起赚钱、谁主导、合不合财" },
  { id: "colleague", ic: "💼", t: "共事 / 同事", sub: "配不配合、会不会互相内耗" },
  { id: "friend", ic: "👯", t: "朋友", sub: "交不交心、处不处得久" },
  { id: "family", ic: "👩‍👧", t: "家人", sub: "懂不懂彼此、能不能和解" },
];
const DIM_COLOR = ["#e69ec8", "#f0a868", "#8fb6d8", "#e0c98a", "#7fc99a"];

// stub partner chart — TODO(invite): real second person via invite link
const PARTNER = computeChart({ year: 1995, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });

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
  const chart = useFunnel((s) => s.chart);
  const [type, setType] = useState<RelType | null>(null);
  useEffect(() => { if (!chart) router.replace("/input"); }, [chart, router]);

  const result = useMemo(() => (chart && type ? synastry(chart, PARTNER, type) : null), [chart, type]);
  if (!chart) return null;

  return (
    <main className="phone" data-testid="synastry">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 8px" }}>
        <span onClick={() => (type ? setType(null) : router.back())} style={{ fontSize: 20, color: "var(--mute)", cursor: "pointer" }}>←</span>
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>合盘</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 24px 18px" }}>
        {!result ? (
          <>
            <div style={{ fontFamily: "var(--serif)", fontSize: 27, color: "var(--cream)", fontWeight: 500, margin: "10px 2px 5px" }}>你想看你俩，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>哪一种「合」？</span></div>
            <div style={{ fontSize: 13, color: "var(--mute)", margin: "0 2px 18px" }}>选不同关系，我看的维度也不同</div>
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
          <Result result={result} />
        )}
      </div>
    </main>
  );
}

function Result({ result }: { result: SynResult }) {
  const router = useRouter();
  const r = reading(result);
  const typeLabel = TYPES.find((t) => t.id === result.type)!.t;
  return (
    <div data-testid="syn-result">
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
      <div onClick={() => router.push("/share")} style={{ margin: "22px 0 6px", textAlign: "center", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>📤 把这份合盘存成卡</div>
      <div style={{ textAlign: "center", fontSize: 10, color: "#566073" }}>说的是相处动态，不是命定结局 · 怎么走你们说了算</div>
    </div>
  );
}
