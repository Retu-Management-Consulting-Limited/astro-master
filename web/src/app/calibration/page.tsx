"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { LoadingRitual } from "@/components/LoadingRitual";
import { track } from "@/lib/track";
import { seed } from "@/lib/astro/timeBelief";
import {
  EVENT_OPTIONS,
  AGE_MIN,
  AGE_MAX,
  AGE_DEFAULT,
  eventsFromSelections,
  type EventSelection,
} from "@/lib/reading/calibrationEvents";

// Two light self-trait questions (a soft opener — they give a crude ASC label we
// keep only for back-compat on the reading page), then the load-bearing "人生大事"
// question that produces the real TimeBelief via rectification.
const TRAIT_QUESTIONS = [
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
];

// 2 trait questions + 1 events question. The events question is the last step.
const TOTAL = TRAIT_QUESTIONS.length + 1;
const EVENTS_IDX = TRAIT_QUESTIONS.length; // index of the 人生大事 step

export default function CalibrationPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const birth = useFunnel((s) => s.birth);
  const setAsc = useFunnel((s) => s.setAsc);
  const setTimeBelief = useFunnel((s) => s.setTimeBelief);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  // events step state: per-kind selected + the age the user dragged to.
  const [evSel, setEvSel] = useState<Record<string, number>>({});

  // Wait for the persisted store to rehydrate before deciding (P1-1): a returning
  // user refreshing here must not be bounced to /input on the first client frame.
  if (!ready || !chart) return null;
  if (loading) return <LoadingRitual line="让我先看看，<br/>你这张盘……" sub="正在为你排盘…" onDone={() => setLoading(false)} />;

  const onEvents = idx === EVENTS_IDX;

  // ── crude ASC consensus from the trait answers (back-compat label only) ──
  function consensusAsc(signs: string[]): string {
    const counts: Record<string, number> = {};
    signs.forEach((s) => (counts[s] = (counts[s] ?? 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // ── trait-question tap ──
  function pick(i: number) {
    setSel(i);
    const next = [...picks, TRAIT_QUESTIONS[idx].opts[i].sign];
    setTimeout(() => {
      setPicks(next);
      setIdx(idx + 1); // → next trait, or → events step
      setSel(null);
    }, 280);
  }

  // ── events-question helpers ──
  function toggleEvent(kind: string) {
    setEvSel((prev) => {
      const next = { ...prev };
      if (kind in next) delete next[kind];
      else next[kind] = AGE_DEFAULT;
      return next;
    });
  }
  function setEventAge(kind: string, age: number) {
    setEvSel((prev) => ({ ...prev, [kind]: age }));
  }

  // ── finish: seed the TimeBelief from real events, then hand off to reading ──
  function finish() {
    const asc = consensusAsc(picks);
    setAsc(asc); // crude back-compat label (reading page still shows it)

    const birthYear = birth?.year ?? new Date().getFullYear();
    const selections: EventSelection[] = EVENT_OPTIONS
      .filter((o) => o.kind in evSel)
      .map((o) => ({ kind: o.kind, age: evSel[o.kind] }));
    const events = eventsFromSelections(birthYear, selections);
    const belief = seed(birth!, events); // birth is present (chart guard passed)
    setTimeBelief(belief);

    track("funnel_calibration", { asc, events: events.length, confidence: belief.confidence });
    router.push("/reading");
  }

  function goBack() {
    if (idx === 0) { router.back(); return; } // back to /input
    setIdx(idx - 1);
    if (idx <= TRAIT_QUESTIONS.length) setPicks(picks.slice(0, -1));
    setSel(null);
  }

  const selectedCount = Object.keys(evSel).length;
  const Q = onEvents ? null : TRAIT_QUESTIONS[idx];

  return (
    <main className="phone">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>校准</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={goBack} aria-label={idx === 0 ? "返回" : "上一题"} style={{ fontSize: 20, lineHeight: 1, color: "var(--mute)", cursor: "pointer", padding: 4, marginLeft: -4 }}>←</button>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{Array.from({ length: TOTAL }).map((_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", display: "block", background: i <= idx ? "var(--gold)" : "#2a3142" }} />)}</div>
        </div>

        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold)" }}>第 {idx + 1} 题 / 共 {TOTAL} 题{onEvents ? " · 这题让我校准你的时辰" : ""}</span>
          <span style={{ flex: 1, height: 3, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${((idx + 1) / TOTAL) * 100}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))", borderRadius: 3, transition: "width .3s" }} />
          </span>
        </div>

        {onEvents ? (
          // ── 人生大事题（design/22 · T-Q1:B）── multi-select chips + per-event age slider
          <>
            <div style={{ marginTop: 20, fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 31, lineHeight: 1.32 }}>
              你身上发生过哪几件<br />「大事」？挑你记得的。
            </div>
            <div style={{ marginTop: 13, fontWeight: 300, fontSize: 13.5, color: "var(--mute)" }}>
              这些大事会在你盘的「四角」上留印——我用它<i style={{ color: "var(--irisc)", fontStyle: "normal" }}>反推你的出生时刻</i>。多挑几件，我能把你的时辰收得更准。
            </div>

            <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {EVENT_OPTIONS.map((o) => {
                const on = o.kind in evSel;
                return (
                  <button key={o.kind} type="button" onClick={() => toggleEvent(o.kind)} data-testid="cal-event" data-on={on ? "1" : "0"}
                    style={{ padding: "10px 15px", borderRadius: 999, fontSize: 14, cursor: "pointer", background: on ? "rgba(201,168,97,.12)" : "var(--field)", border: `1px solid ${on ? "var(--gold)" : "var(--field-bd)"}`, color: on ? "var(--cream)" : "var(--cream-dim)", boxShadow: on ? "0 0 0 3px rgba(201,168,97,.07)" : "none" }}>
                    {o.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
              {EVENT_OPTIONS.filter((o) => o.kind in evSel).map((o) => (
                <div key={o.kind}>
                  <div style={{ fontSize: 15, color: "var(--cream)", marginBottom: 8 }}>
                    「{o.label}」那年，你几岁？ <b style={{ color: "var(--gold)" }}>{evSel[o.kind]}</b> 岁
                  </div>
                  <input type="range" data-testid="cal-event-age" data-kind={o.kind}
                    min={AGE_MIN} max={AGE_MAX} step={1} value={evSel[o.kind]}
                    onChange={(e) => setEventAge(o.kind, Number(e.target.value))}
                    aria-label={`${o.label} 发生时的年龄`}
                    style={{ width: "100%", accentColor: "var(--gold)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5a6173", marginTop: 2 }}>
                    <span>{AGE_MIN} 岁</span><span>{AGE_MAX} 岁</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 22 }}>
              <button type="button" onClick={finish} data-testid="cal-finish"
                style={{ width: "100%", padding: "16px", borderRadius: 15, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 500, color: "#1a1205", background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))", boxShadow: "0 8px 24px rgba(201,168,97,.2)" }}>
                {selectedCount > 0 ? `就这 ${selectedCount} 件 · 帮我反推时辰` : "实在想不起 · 跳过这步"}
              </button>
            </div>

            <div style={{ marginTop: 16, textAlign: "center", fontSize: 11.5, color: "#5a6173" }}>
              <i style={{ color: "var(--irisc)", fontStyle: "normal" }}>多件事交叉，比单点准得多</i> · 我不是算命，是用你真实经历对天象
            </div>
          </>
        ) : (
          // ── 自我特质题 ──
          <>
            <div style={{ marginTop: 20, fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 31, lineHeight: 1.32 }}>
              {Q!.q[0]}<br />{Q!.q[1]}
            </div>
            <div style={{ marginTop: 13, fontWeight: 300, fontSize: 13.5, color: "var(--mute)" }}>{Q!.hint}</div>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
              {Q!.opts.map((o, i) => (
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
          </>
        )}
      </div>
    </main>
  );
}
