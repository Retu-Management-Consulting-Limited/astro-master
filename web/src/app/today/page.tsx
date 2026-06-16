"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { TabBar } from "@/components/TabBar";
import { dailyReading, dayKey, existedYesterday } from "@/lib/reading/daily";
import { todayVerdict } from "@/lib/reading/todayVerdict";
import { TodayCell } from "@/components/TodayCell";
import { useUnderstanding } from "@/lib/understanding";
import { useNow } from "@/lib/useNow";
import { appendMood, parseMoodLog, moodLogKey, fmtTime, type MoodEntry } from "@/lib/mood";
import { biorhythmSeries, criticalDims, pct, parseBirthDate, type RhythmKey } from "@/lib/biorhythm";
import { track } from "@/lib/track";

const MOODS = [
  { e: "😌", t: "平静" },
  { e: "😮‍💨", t: "喘口气" },
  { e: "😔", t: "低落" },
  { e: "🔥", t: "有劲" },
  { e: "🌧️", t: "低潮" },
];

// 体力 / 情绪 / 智力 — label + line color, in render order
const RHYTHMS: { k: RhythmKey; t: string; c: string }[] = [
  { k: "physical", t: "体力", c: "#E8965A" },
  { k: "emotional", t: "情绪", c: "#8FC2E6" },
  { k: "intellectual", t: "智力", c: "#B69CE8" },
];

export default function TodayPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const birthForm = useFunnel((s) => s.birthForm);
  const recordVerdict = useFunnel((s) => s.recordVerdict);
  const recordCheckin = useFunnel((s) => s.recordCheckin);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const understand = useUnderstanding();
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]); // today's check-ins {mood, ts}
  const [verdict, setVerdict] = useState<"hit" | "miss" | null>(null);
  // "today" in the device's LOCAL time, refreshed whenever the app is re-shown
  // (so a kept-open / installed PWA rolls over to the new day, not frozen).
  const now = useNow();
  const dkNow = now ? dayKey(now) : null;

  // Load this day's persisted mood/verdict; re-runs when the day changes (e.g.
  // user reopens after midnight) so yesterday's state doesn't bleed into today.
  useEffect(() => {
    if (!dkNow) return;
    try {
      setMoodLog(parseMoodLog(localStorage.getItem(moodLogKey(dkNow))));
      const v = localStorage.getItem(`molly_verdict_${dkNow}`);
      setVerdict(v === "hit" || v === "miss" ? v : null);
    } catch {}
  }, [dkNow]);

  // S0 money-funnel impression. The money entry is now a chip inside the 今 card
  // (was a standalone EntryCard); preserve the exact event so the H1/H2/H3 funnel
  // top keeps its signal. Fire once, when the page actually renders for a user.
  const moneyImpr = useRef(false);
  useEffect(() => {
    if (ready && chart && !moneyImpr.current) {
      moneyImpr.current = true;
      track("money_entry_impression", { surface: "today" });
    }
  }, [ready, chart]);

  if (!ready || !chart || !now) return null;

  const dk = dayKey(now);
  const daily = dailyReading(chart, now);
  const tv = todayVerdict(chart, now);

  // 今日格点门 / fortune chip → 财运 tab，红日带 doorDate 那天直接选中。
  function goWealth(selDay?: number) {
    router.push(selDay ? `/wealth?selDay=${selDay}` : "/wealth");
  }

  function pickMood(t: string) {
    const ts = Date.now();
    setMoodLog((prev) => {
      const next = appendMood(prev, t, ts); // a new {mood, ts} check-in — keeps the day's history
      try { localStorage.setItem(moodLogKey(dk), JSON.stringify(next)); } catch {}
      return next;
    });
    recordCheckin(dk);
    track("mood_checkin", { mood: t, ts });
  }
  function pickVerdict(hit: boolean) {
    if (verdict) return; // one verdict per day
    setVerdict(hit ? "hit" : "miss");
    try { localStorage.setItem(`molly_verdict_${dk}`, hit ? "hit" : "miss"); } catch {}
    recordVerdict(hit, dk);
    track("daily_verdict", { hit });
  }

  return (
    <main className="phone" data-testid="today">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>今日</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "24px 22px 10px" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--cream-dim)" }}>
          懂你 <span style={{ width: 40, height: 4, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${understand}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> <b style={{ color: "var(--gold)" }}>{understand}%</b>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 20px 12px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", fontWeight: 500, margin: "6px 4px 12px" }}>
          {nickname ?? "你"}，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>我有三句话</i>给你。
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(143,182,216,.07)", border: "1px solid rgba(143,182,216,.18)", borderRadius: 11, padding: "9px 12px", fontSize: 12.5, color: "var(--blue)", marginBottom: 16 }}>
          🌙 <span>月亮入{daily.moonSign} · <b style={{ color: "#cfe0f0" }}>{daily.moonLine}</b></span>
        </div>

        {/* 体力/情绪/智力 节律 — biorhythm ±7d mini-curve (playful, not medical) */}
        {birthForm && <BiorhythmCard birth={parseBirthDate(birthForm.date)} today={now} />}

        {/* 昨 — only after the user has actually been around a prior day; never ask
            a day-1 user to validate a prediction we never showed them (T-1) */}
        {existedYesterday(joinedAt, now) && (
        <div data-testid="yesterday-card" style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(143,182,216,.28)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--blue)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} aria-hidden="true" />昨天 · 你说中了吗{verdict === "hit" && <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: 0, color: "var(--green)", textTransform: "none" }}>+2% 校准 ✓</span>}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>我说你昨天会<b style={{ color: "var(--cream)" }}>{daily.yesterdayClaim}</b>——对吗？</div>
          <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
            <button type="button" data-testid="verdict-hit" aria-pressed={verdict === "hit"} disabled={!!verdict} onClick={() => pickVerdict(true)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: `1px solid ${verdict === "hit" ? "var(--green)" : "rgba(127,201,154,.4)"}`, background: verdict === "hit" ? "rgba(127,201,154,.22)" : "rgba(127,201,154,.12)", color: "var(--green)", cursor: verdict ? "default" : "pointer", opacity: verdict === "miss" ? 0.4 : 1 }}>嗯，是这样 ✓</button>
            <button type="button" data-testid="verdict-miss" aria-pressed={verdict === "miss"} disabled={!!verdict} onClick={() => pickVerdict(false)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: "1px solid #2b3a4e", background: verdict === "miss" ? "rgba(143,182,216,.18)" : "transparent", color: "#a9c4dd", cursor: verdict ? "default" : "pointer", opacity: verdict === "hit" ? 0.4 : 1 }}>其实没有</button>
          </div>
          {verdict === "miss" && <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 8 }}>记下了——我会再调，慢慢更懂你。</div>}
        </div>
        )}

        {/* 今 hero — three-state 今日格 (design/20)：旺/慎/平淡各一副面孔。
            状态标·命令·内在why·赦免糖·动作/前门(红日 doorDate→财运当天)·备战糖·fortune chip。*/}
        <TodayCell verdict={tv} daily={daily} onWealth={goWealth} />

        {/* S0 金钱入口 — chip 紧跟今日格，承袭旧 EntryCard 的 testid + /money 目标，
            保住 H1/H2/H3 漏斗顶的信号；放在 TodayCell 外，让三态卡专注当日判词。*/}
        <button type="button" onClick={() => router.push("/money")} data-testid="money-entry" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: -2, marginBottom: 12, padding: "9px 12px", borderRadius: 11, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.34)", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} aria-hidden="true" /><span>钱，对你<b style={{ color: "var(--cream)" }}>不只是钱</b></span><span style={{ marginLeft: "auto", color: "var(--gold-soft)" }}>让 Molly 看穿 →</span>
        </button>

        {/* 明 — real hook from tomorrow's transit */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(181,143,176,.26)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--irisc)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--irisc)" }} aria-hidden="true" />明天</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>{daily.tomorrowHook} 🔮</div>
        </div>

        {/* 心情打卡 — multi-time-per-day log: every tap records {mood, time} */}
        <div style={{ marginTop: 4, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 17, padding: "14px 16px" }}>
          <div style={{ fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 11 }}>
            {moodLog.length ? <>此刻的你，是哪一种？<span style={{ color: "var(--mute)" }}>· 今天记了 {moodLog.length} 次，可以再记一次</span></> : "此刻的你，是哪一种？"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {MOODS.map((m) => {
              const on = moodLog.length > 0 && moodLog[moodLog.length - 1].mood === m.t; // most recent
              return (
                <button key={m.t} type="button" data-testid="mood" aria-label={m.t} aria-pressed={on} onClick={() => pickMood(m.t)}
                  style={{ width: 46, height: 46, borderRadius: "50%", background: on ? "rgba(201,168,97,.14)" : "#161b29", border: `1px solid ${on ? "var(--gold)" : "#2b3242"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, cursor: "pointer", boxShadow: on ? "0 0 0 3px rgba(201,168,97,.1)" : "none" }}>
                  <span aria-hidden="true">{m.e}</span>
                </button>
              );
            })}
          </div>
          {moodLog.length > 0 && (
            <div data-testid="mood-timeline" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", flexWrap: "wrap", gap: "5px 12px", fontSize: 11.5, color: "var(--cream-dim)" }}>
              {moodLog.map((e, i) => {
                const em = MOODS.find((mm) => mm.t === e.mood);
                return <span key={i}><b style={{ color: "var(--mute)", fontWeight: 400 }}>{fmtTime(e.ts)}</b> <span aria-hidden="true">{em?.e ?? ""}</span> {e.mood}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      <TabBar active="today" />
    </main>
  );
}

// Biorhythm ±7-day mini-curve: three sine waves off days-since-birth. Deterministic and
// playful (NOT medical/astrological) — phrased as a self-awareness mirror.
function BiorhythmCard({ birth, today }: { birth: Date | null; today: Date }) {
  if (!birth) return null;
  const span = 14;
  const series = biorhythmSeries(birth, today, span);
  const now = series.find((p) => p.offset === 0)!.rhythm;
  const crit = criticalDims(birth, today);
  const W = 300, H = 92, padX = 6, padY = 14, midY = H / 2;
  const x = (off: number) => padX + ((off + span) / (2 * span)) * (W - 2 * padX);
  const y = (v: number) => midY - v * ((H - 2 * padY) / 2);
  const path = (k: RhythmKey) => series.map((p) => `${x(p.offset).toFixed(1)},${y(p.rhythm[k]).toFixed(1)}`).join(" ");

  return (
    <div data-testid="biorhythm" style={{ marginTop: 12, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 17, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>你的节律 · 体力 / 情绪 / 智力</div>
      <div style={{ fontSize: 11.5, color: "var(--mute)", marginBottom: 10 }}>从你出生那天起算的三条周期，给你一个自我觉察的参照 · 今天前后各两周</div>
      <svg data-testid="biorhythm-curve" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="体力情绪智力节律曲线" style={{ display: "block" }}>
        {/* zero baseline */}
        <line x1={padX} y1={midY} x2={W - padX} y2={midY} stroke="rgba(255,255,255,.1)" strokeDasharray="3 4" />
        {/* today marker */}
        <line x1={x(0)} y1={padY - 4} x2={x(0)} y2={H - padY + 4} stroke="var(--gold-deep)" strokeWidth={1} strokeDasharray="2 3" />
        <text x={x(0)} y={H - 2} textAnchor="middle" fontSize="8.5" fill="var(--gold-soft)">今天</text>
        {RHYTHMS.map((r) => (
          <polyline key={r.k} points={path(r.k)} fill="none" stroke={r.c} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {RHYTHMS.map((r) => (
          <circle key={r.k} cx={x(0)} cy={y(now[r.k])} r={3} fill={r.c} stroke="#0c0f1a" strokeWidth={1} />
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {RHYTHMS.map((r) => (
          <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: r.c, flex: "0 0 auto" }} />
            <span style={{ color: "var(--cream-dim)" }}>{r.t}</span>
            <b style={{ color: r.c }}>{pct(now[r.k]) > 0 ? "+" : ""}{pct(now[r.k])}%</b>
            {crit.includes(r.k) && <span style={{ fontSize: 10, color: "var(--gold-soft)" }}>· 临界</span>}
          </div>
        ))}
      </div>
      {crit.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 9, lineHeight: 1.6 }}>
          今天{crit.map((k) => RHYTHMS.find((r) => r.k === k)!.t).join("、")}正处临界点——状态容易起伏，对自己温柔一点。
        </div>
      )}
    </div>
  );
}
