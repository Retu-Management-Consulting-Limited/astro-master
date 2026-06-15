"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { TabBar } from "@/components/TabBar";
import { dayWealth } from "@/lib/astro/wealth";
import { dailyReading, dayKey, existedYesterday } from "@/lib/reading/daily";
import { useUnderstanding } from "@/lib/understanding";
import { useNow } from "@/lib/useNow";
import { track } from "@/lib/track";

const MOODS = [
  { e: "😌", t: "平静" },
  { e: "😮‍💨", t: "喘口气" },
  { e: "😔", t: "低落" },
  { e: "🔥", t: "有劲" },
  { e: "🌧️", t: "低潮" },
];

export default function TodayPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const recordVerdict = useFunnel((s) => s.recordVerdict);
  const recordCheckin = useFunnel((s) => s.recordCheckin);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const understand = useUnderstanding();
  const [mood, setMood] = useState<string | null>(null);
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
      setMood(localStorage.getItem(`molly_mood_${dkNow}`));
      const v = localStorage.getItem(`molly_verdict_${dkNow}`);
      setVerdict(v === "hit" || v === "miss" ? v : null);
    } catch {}
  }, [dkNow]);

  if (!ready || !chart || !now) return null;

  const dk = dayKey(now);
  const daily = dailyReading(chart, now);
  const tw = dayWealth(chart, now.getFullYear(), now.getMonth() + 1, now.getDate());
  const fortune = tw.level === "wang"
    ? { c: "var(--green)", b: "#a8e0bf", label: "旺", txt: "该收的款、该谈的薪今天去推" }
    : tw.level === "shen"
    ? { c: "var(--red)", b: "#f0a8a5", label: "慎", txt: "今天别冲动消费，想下单先睡一觉" }
    : { c: "var(--blue)", b: "#cfe0f0", label: "平", txt: "钱上没大事，按计划走就好" };

  function pickMood(t: string) {
    setMood(t);
    try { localStorage.setItem(`molly_mood_${dk}`, t); } catch {}
    recordCheckin(dk);
    track("mood_checkin", { mood: t });
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
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "24px 22px 10px" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--cream-dim)" }}>
          懂你 <span style={{ width: 40, height: 4, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${understand}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> <b style={{ color: "var(--gold)" }}>{understand}%</b> ↑
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 20px 12px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", fontWeight: 500, margin: "6px 4px 12px" }}>
          {nickname ?? "你"}，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>我有三句话</i>给你。
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(143,182,216,.07)", border: "1px solid rgba(143,182,216,.18)", borderRadius: 11, padding: "9px 12px", fontSize: 12.5, color: "var(--blue)", marginBottom: 16 }}>
          🌙 <span>月亮入{daily.moonSign} · <b style={{ color: "#cfe0f0" }}>{daily.moonLine}</b></span>
        </div>

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

        {/* 今 hero — real transit line + quote */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(201,168,97,.4)", background: "linear-gradient(180deg, rgba(201,168,97,.07), rgba(201,168,97,.02))", boxShadow: "0 0 30px -12px rgba(201,168,97,.4)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--gold)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} aria-hidden="true" />今天</div>
          <div style={{ fontSize: 15.5, color: "var(--cream)", lineHeight: 1.68 }}>{daily.todayLine}</div>
          <div style={{ marginTop: 11, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--gold-soft)", lineHeight: 1.5 }}>{daily.todayQuote}</div>
          <button type="button" onClick={() => router.push("/wealth")} data-testid="fortune-chip" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: 13, padding: "9px 12px", borderRadius: 11, background: "rgba(127,201,154,.07)", border: `1px solid ${fortune.c}55`, fontSize: 12.5, color: fortune.c, cursor: "pointer" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: fortune.c, boxShadow: `0 0 8px ${fortune.c}` }} aria-hidden="true" /><span>今日财运 <b style={{ color: fortune.b }}>{fortune.label}</b> · {fortune.txt}</span><span style={{ marginLeft: "auto", color: "#5f8f73" }}>查日历 →</span>
          </button>
        </div>

        {/* 明 — real hook from tomorrow's transit */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(181,143,176,.26)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--irisc)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--irisc)" }} aria-hidden="true" />明天</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>{daily.tomorrowHook} 🔮</div>
        </div>

        {/* 心情打卡 — real, persisted per day */}
        <div style={{ marginTop: 4, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 17, padding: "14px 16px" }}>
          <div style={{ fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 11 }}>
            {mood ? <>今天你选了 <b style={{ color: "var(--gold-soft)" }}>{mood}</b> · 我记下了</> : "此刻的你，是哪一种？"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {MOODS.map((m) => {
              const on = mood === m.t;
              return (
                <button key={m.t} type="button" data-testid="mood" aria-label={m.t} aria-pressed={on} onClick={() => pickMood(m.t)}
                  style={{ width: 46, height: 46, borderRadius: "50%", background: on ? "rgba(201,168,97,.14)" : "#161b29", border: `1px solid ${on ? "var(--gold)" : "#2b3242"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, cursor: "pointer", boxShadow: on ? "0 0 0 3px rgba(201,168,97,.1)" : "none" }}>
                  <span aria-hidden="true">{m.e}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <TabBar active="today" />
    </main>
  );
}
