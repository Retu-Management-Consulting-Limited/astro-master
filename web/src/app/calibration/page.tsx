"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { LoadingRitual } from "@/components/LoadingRitual";

const QUESTIONS = [
  {
    q: ["别人第一次见到你，", "最常用哪个词形容你？"],
    hint: "凭第一直觉——第一个念头，最接近真的你。",
    opts: [
      { t: "沉稳内敛，不太外露", sign: "摩羯" },
      { t: "神秘，让人看不太透", sign: "天蝎" },
      { t: "热情，有股冲劲", sign: "白羊" },
      { t: "亲切，很好相处", sign: "天秤" },
    ],
  },
  {
    q: ["走进一个陌生场合，", "你的第一反应是？"],
    hint: "别想太多，身体比脑子诚实。",
    opts: [
      { t: "先观察全场再行动", sign: "天蝎" },
      { t: "马上找人攀谈", sign: "白羊" },
      { t: "安静待在角落", sign: "巨蟹" },
      { t: "找个熟人黏着", sign: "双鱼" },
    ],
  },
  {
    q: ["大家常说你「看起来」像，", "但其实内在不是？"],
    hint: "外壳和内里，往往相反。",
    opts: [
      { t: "看起来很冷，其实很软", sign: "天蝎" },
      { t: "看起来很强，其实很累", sign: "摩羯" },
      { t: "看起来没心没肺，其实想很多", sign: "双子" },
      { t: "看起来稳，其实很慌", sign: "处女" },
    ],
  },
];

export default function CalibrationPage() {
  const router = useRouter();
  const chart = useFunnel((s) => s.chart);
  const setAsc = useFunnel((s) => s.setAsc);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    if (!chart) router.replace("/input");
  }, [chart, router]);

  if (loading) return <LoadingRitual line="让我先看看，<br/>你这张盘……" sub="正在为你排盘…" onDone={() => setLoading(false)} />;

  const Q = QUESTIONS[idx];
  function pick(i: number) {
    setSel(i);
    const next = [...picks, QUESTIONS[idx].opts[i].sign];
    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) {
        setPicks(next);
        setIdx(idx + 1);
        setSel(null);
      } else {
        // crude consensus: most-picked sign as ASC candidate
        const counts: Record<string, number> = {};
        next.forEach((s) => (counts[s] = (counts[s] ?? 0) + 1));
        const asc = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        setAsc(asc);
        router.push("/reading");
      }
    }, 280);
  }

  return (
    <main className="phone">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", display: "block", background: i <= 1 ? "var(--gold)" : "#2a3142" }} />)}</div>
        </div>

        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold)" }}>第 {idx + 1} 题 / 共 3 题</span>
          <span style={{ flex: 1, height: 3, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${((idx + 1) / 3) * 100}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))", borderRadius: 3, transition: "width .3s" }} />
          </span>
        </div>

        <div style={{ marginTop: 20, fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 31, lineHeight: 1.32 }}>
          {Q.q[0]}<br />{Q.q[1]}
        </div>
        <div style={{ marginTop: 13, fontWeight: 300, fontSize: 13.5, color: "var(--mute)" }}>{Q.hint}</div>

        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
          {Q.opts.map((o, i) => (
            <button key={i} onClick={() => pick(i)} data-testid="cal-opt"
              style={{ display: "flex", alignItems: "center", gap: 14, background: sel === i ? "rgba(201,168,97,.07)" : "var(--field)", border: `1px solid ${sel === i ? "var(--gold)" : "var(--field-bd)"}`, borderRadius: 15, padding: "17px 16px", cursor: "pointer", boxShadow: sel === i ? "0 0 0 3px rgba(201,168,97,.08)" : "none", textAlign: "left" }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${sel === i ? "var(--gold)" : "#3a4252"}`, flex: "0 0 auto", position: "relative" }}>
                {sel === i && <span style={{ position: "absolute", inset: 4, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} />}
              </span>
              <span style={{ fontSize: 16, color: sel === i ? "var(--cream)" : "var(--cream-dim)" }}>{o.t}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", textAlign: "center", fontSize: 11.5, color: "#5a6173" }}>每答一题，<i style={{ color: "var(--irisc)", fontStyle: "normal" }}>我就更看清你一点</i></div>
      </div>
    </main>
  );
}
