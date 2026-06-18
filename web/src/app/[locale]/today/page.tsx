"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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

// 心情：key 为「持久存储标识」——跨 moodHistory(VALENCE) + history 页(MOOD_FACE)
// 共用的稳定数据键，绝不可改（改了会断历史曲线/表情查表，那是 T9 的契约）。故 key
// 保留中文字面量（数据键，非 UI 文案，带 i18n-allow-cjk 豁免）；id 为 messages 标识，
// 显示 label 走 t(`moods.<id>`)；emoji 固定。
const MOODS: { key: string; id: string; e: string }[] = [
  { key: "平静", id: "calm", e: "😌" }, // i18n-allow-cjk: 持久存储键（moodHistory/history 共用），非 UI 文案
  { key: "喘口气", id: "breathe", e: "😮‍💨" }, // i18n-allow-cjk
  { key: "低落", id: "down", e: "😔" }, // i18n-allow-cjk
  { key: "有劲", id: "energized", e: "🔥" }, // i18n-allow-cjk
  { key: "低潮", id: "lowTide", e: "🌧️" }, // i18n-allow-cjk
];

// 体力 / 情绪 / 智力 — RhythmKey + line color, in render order；label 走 t()。
const RHYTHMS: { k: RhythmKey; c: string }[] = [
  { k: "physical", c: "#E8965A" },
  { k: "emotional", c: "#8FC2E6" },
  { k: "intellectual", c: "#B69CE8" },
];

export default function TodayPage() {
  const router = useRouter();
  const t = useTranslations("today");
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

  // 今日格点门 / 财运 chip → /wealth 页，红日带 doorDate 那天直接选中。
  function goWealth(selDay?: number) {
    router.push(selDay ? `/wealth?selDay=${selDay}` : "/wealth");
  }
  // 身心 chip → /body 身心日历（T4 Phase 3 · 对称于财运 chip）。
  function goBody() {
    router.push("/body");
  }

  function pickMood(key: string) {
    const ts = Date.now();
    setMoodLog((prev) => {
      const next = appendMood(prev, key, ts); // a new {mood, ts} check-in — keeps the day's history
      try { localStorage.setItem(moodLogKey(dk), JSON.stringify(next)); } catch {}
      return next;
    });
    recordCheckin(dk);
    track("mood_checkin", { mood: key, ts });
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
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "24px 22px 10px" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--cream-dim)" }}>
          {t("understand")} <span style={{ width: 40, height: 4, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${understand}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> <b style={{ color: "var(--gold)" }}>{understand}%</b>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 20px 12px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", fontWeight: 500, margin: "6px 4px 12px" }}>
          {nickname ?? t("greetingFallbackName")}{t("greetingSuffix")}<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("greetingEmphasis")}</i>{t("greetingAfter")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(143,182,216,.07)", border: "1px solid rgba(143,182,216,.18)", borderRadius: 11, padding: "9px 12px", fontSize: 12.5, color: "var(--blue)", marginBottom: 16 }}>
          🌙 <span>{t("moonPrefix")}{daily.moonSign} · <b style={{ color: "#cfe0f0" }}>{daily.moonLine}</b></span>
        </div>

        {/* 体力/情绪/智力 节律 — biorhythm ±7d mini-curve (playful, not medical) */}
        {birthForm && <BiorhythmCard birth={parseBirthDate(birthForm.date)} today={now} />}

        {/* 昨 — only after the user has actually been around a prior day; never ask
            a day-1 user to validate a prediction we never showed them (T-1) */}
        {existedYesterday(joinedAt, now) && (
        <div data-testid="yesterday-card" style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(143,182,216,.28)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--blue)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} aria-hidden="true" />{t("yesterdayLabel")}{verdict === "hit" && <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: 0, color: "var(--green)", textTransform: "none" }}>{t("yesterdayCalibrated")}</span>}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>{t("yesterdayClaimBefore")}<b style={{ color: "var(--cream)" }}>{daily.yesterdayClaim}</b>{t("yesterdayClaimAfter")}</div>
          <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
            <button type="button" data-testid="verdict-hit" aria-pressed={verdict === "hit"} disabled={!!verdict} onClick={() => pickVerdict(true)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: `1px solid ${verdict === "hit" ? "var(--green)" : "rgba(127,201,154,.4)"}`, background: verdict === "hit" ? "rgba(127,201,154,.22)" : "rgba(127,201,154,.12)", color: "var(--green)", cursor: verdict ? "default" : "pointer", opacity: verdict === "miss" ? 0.4 : 1 }}>{t("verdictHit")}</button>
            <button type="button" data-testid="verdict-miss" aria-pressed={verdict === "miss"} disabled={!!verdict} onClick={() => pickVerdict(false)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: "1px solid #2b3a4e", background: verdict === "miss" ? "rgba(143,182,216,.18)" : "transparent", color: "#a9c4dd", cursor: verdict ? "default" : "pointer", opacity: verdict === "hit" ? 0.4 : 1 }}>{t("verdictMiss")}</button>
          </div>
          {verdict === "miss" && <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 8 }}>{t("verdictMissNote")}</div>}
        </div>
        )}

        {/* 今 hero — three-state 今日格 (design/20)：旺/慎/平淡各一副面孔。
            状态标·命令·内在why·赦免糖·动作/前门(红日 doorDate→财运当天)·备战糖·fortune chip。*/}
        <TodayCell verdict={tv} daily={daily} onWealth={goWealth} onBody={goBody} />

        {/* S0 金钱入口 — chip 紧跟今日格，承袭旧 EntryCard 的 testid + /money 目标，
            保住 H1/H2/H3 漏斗顶的信号；放在 TodayCell 外，让三态卡专注当日判词。*/}
        <button type="button" onClick={() => router.push("/money")} data-testid="money-entry" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, marginTop: -2, marginBottom: 12, padding: "9px 12px", borderRadius: 11, background: "rgba(201,168,97,.07)", border: "1px solid rgba(201,168,97,.34)", fontSize: 12.5, color: "var(--gold-soft)", cursor: "pointer" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} aria-hidden="true" /><span>{t("moneyEntryBefore")}<b style={{ color: "var(--cream)" }}>{t("moneyEntryEmphasis")}</b></span><span style={{ marginLeft: "auto", color: "var(--gold-soft)" }}>{t("moneyEntryCta")}</span>
        </button>

        {/* 明 — real hook from tomorrow's transit */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(181,143,176,.26)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--irisc)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--irisc)" }} aria-hidden="true" />{t("tomorrowLabel")}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>{daily.tomorrowHook} 🔮</div>
        </div>

        {/* 心情打卡 — multi-time-per-day log: every tap records {mood, time} */}
        <div style={{ marginTop: 4, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 17, padding: "14px 16px" }}>
          <div style={{ fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 11 }}>
            {moodLog.length ? <>{t("moodPrompt")}<span style={{ color: "var(--mute)" }}>{t("moodCount", { count: moodLog.length })}</span></> : t("moodPrompt")}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {MOODS.map((m) => {
              const on = moodLog.length > 0 && moodLog[moodLog.length - 1].mood === m.key; // most recent
              return (
                <button key={m.id} type="button" data-testid="mood" aria-label={t(`moods.${m.id}`)} aria-pressed={on} onClick={() => pickMood(m.key)}
                  style={{ width: 46, height: 46, borderRadius: "50%", background: on ? "rgba(201,168,97,.14)" : "#161b29", border: `1px solid ${on ? "var(--gold)" : "#2b3242"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, cursor: "pointer", boxShadow: on ? "0 0 0 3px rgba(201,168,97,.1)" : "none" }}>
                  <span aria-hidden="true">{m.e}</span>
                </button>
              );
            })}
          </div>
          {moodLog.length > 0 && (
            <div data-testid="mood-timeline" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", flexWrap: "wrap", gap: "5px 12px", fontSize: 11.5, color: "var(--cream-dim)" }}>
              {moodLog.map((e, i) => {
                const em = MOODS.find((mm) => mm.key === e.mood);
                return <span key={i}><b style={{ color: "var(--mute)", fontWeight: 400 }}>{fmtTime(e.ts)}</b> <span aria-hidden="true">{em?.e ?? ""}</span> {em ? t(`moods.${em.id}`) : e.mood}</span>;
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
  const t = useTranslations("today");
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
      <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>{t("biorhythm.title")}</div>
      <div style={{ fontSize: 11.5, color: "var(--mute)", marginBottom: 10 }}>{t("biorhythm.subtitle")}</div>
      <svg data-testid="biorhythm-curve" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t("biorhythm.curveAlt")} style={{ display: "block" }}>
        {/* zero baseline */}
        <line x1={padX} y1={midY} x2={W - padX} y2={midY} stroke="rgba(255,255,255,.1)" strokeDasharray="3 4" />
        {/* today marker */}
        <line x1={x(0)} y1={padY - 4} x2={x(0)} y2={H - padY + 4} stroke="var(--gold-deep)" strokeWidth={1} strokeDasharray="2 3" />
        <text x={x(0)} y={H - 2} textAnchor="middle" fontSize="8.5" fill="var(--gold-soft)">{t("biorhythm.todayMarker")}</text>
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
            <span style={{ color: "var(--cream-dim)" }}>{t(`rhythms.${r.k}`)}</span>
            <b style={{ color: r.c }}>{pct(now[r.k]) > 0 ? "+" : ""}{pct(now[r.k])}%</b>
            {crit.includes(r.k) && <span style={{ fontSize: 10, color: "var(--gold-soft)" }}>{t("biorhythm.criticalTag")}</span>}
          </div>
        ))}
      </div>
      {crit.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 9, lineHeight: 1.6 }}>
          {t("biorhythm.criticalNoteBefore")}{crit.map((k) => t(`rhythms.${k}`)).join(t("biorhythm.criticalNoteSep"))}{t("biorhythm.criticalNoteAfter")}
        </div>
      )}
    </div>
  );
}
