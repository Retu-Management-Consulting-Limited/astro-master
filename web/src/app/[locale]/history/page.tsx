"use client";
import { useEffect, useState } from "react";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { daysSince } from "@/lib/relationship";
import { useUnderstanding } from "@/lib/understanding";
import { BackButton } from "@/components/BackButton";
import { collectMoodHistory, shortDay, type DayMood } from "@/lib/moodHistory";
import { fmtTime } from "@/lib/mood";

// emoji + label per mood, mirrors the today page's MOODS set
const MOOD_FACE: Record<string, string> = { 有劲: "🔥", 平静: "😌", 喘口气: "😮‍💨", 低落: "😔", 低潮: "🌧️" };
// nearest face for a day's average valence, for the curve's dots
function faceForAvg(avg: number): string {
  if (avg >= 1.5) return "🔥";
  if (avg >= 0.5) return "😌";
  if (avg > -0.5) return "😮‍💨";
  if (avg > -1.5) return "😔";
  return "🌧️";
}

export default function HistoryPage() {
  const { chart, ready } = useChartGuard();
  const firstRead = useFunnel((s) => s.firstRead);
  const nickname = useFunnel((s) => s.nickname);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const understand = useUnderstanding();
  // Cross-day mood curve — loaded client-side from localStorage (real check-ins only).
  const [moodDays, setMoodDays] = useState<DayMood[]>([]);
  useEffect(() => {
    try {
      setMoodDays(collectMoodHistory(localStorage));
    } catch {}
  }, []);
  if (!ready || !chart) return null;

  const days = daysSince(joinedAt);
  const quote = firstRead?.quote ?? "你最大的本事，是让所有人都以为你不需要任何人。";

  return (
    <main className="phone" data-testid="history">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>历史回看</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".2em", fontSize: 14, color: "var(--cream)" }}>历史回看</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--cream)", fontWeight: 500, margin: "6px 2px 16px" }}>
          {days === 0 ? <>我们，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>今天才刚认识。</i></> : <>我们一起走过的，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{days} 天。</i></>}
        </div>

        {/* timeline */}
        <div style={{ position: "relative", paddingLeft: 18, marginTop: 4 }}>
          <div style={{ position: "absolute", left: 4, top: 6, bottom: 30, width: 1, background: "linear-gradient(180deg, var(--gold-deep), transparent)" }} />

          {/* day 1 — the real first meeting */}
          <Entry dot="var(--gold)">
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>第一天 · 你让我看你的盘</div>
            <div style={{ fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.65, marginBottom: 9 }}>{nickname ? `${nickname}，` : ""}我对你说的第一句话是——</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17.5, color: "var(--gold-soft)", lineHeight: 1.6, borderLeft: "2px solid var(--gold-deep)", paddingLeft: 13 }}>{quote}</div>
          </Entry>

          {/* the real emotional line — only when there ARE check-ins (never a fake curve) */}
          {moodDays.length > 0 && (
            <Entry dot="var(--gold-soft)">
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>这几天 · 你走过的情绪</div>
              <MoodCurve days={moodDays} />
              <div data-testid="mood-history" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                {[...moodDays].reverse().map((d) => (
                  <div key={d.dayKey} style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 12 }}>
                    <b style={{ color: "var(--mute)", fontWeight: 400, flex: "0 0 auto", width: 42 }}>{shortDay(d.dayKey)}</b>
                    <span style={{ color: "var(--cream-dim)", lineHeight: 1.5 }}>
                      {d.entries.map((e, i) => (
                        <span key={i} title={`${fmtTime(e.ts)} ${e.mood}`} style={{ marginRight: 4 }} aria-label={`${e.mood} ${fmtTime(e.ts)}`}>{MOOD_FACE[e.mood] ?? "·"}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 10, lineHeight: 1.6 }}>
                {moodDays.length === 1 ? "记一天，是一个点；多回来几天，它就连成一条线。" : `${moodDays.length} 天的心情，连起来就是上面这条线。`}
              </div>
            </Entry>
          )}

          <Entry dot="#3a4a7d">
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 6 }}>到现在 · 我对你的准度</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--cream-dim)" }}>
              懂你 <span style={{ flex: 1, maxWidth: 140, height: 5, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${understand}%`, background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> <b style={{ color: "var(--gold)" }}>{understand}%</b>
            </div>
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 8, lineHeight: 1.6 }}>你每天回我一句「说中了吗」，我就更准一点。这条线，只会往上走。</div>
          </Entry>

          {/* honest forward promise — NOT a fabricated past */}
          <Entry dot="#2b3242" last>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 6 }}>往后 · 等我们的日子够长</div>
            <div style={{ fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.7 }}>
              满 <b style={{ color: "var(--cream)" }}>30 天</b>，上面这条情绪线会长成完整的一个月，我帮你看出其中的起落。<br />
              满 <b style={{ color: "var(--cream)" }}>一年</b>，我会在每个「一年前的今天」，提醒你——你当时在怕什么，后来又怎么走过来了。
            </div>
            <div style={{ fontSize: 11.5, color: "var(--gold-soft)", marginTop: 10 }}>所以别走丢。每天来一下，这条路才连得起来。</div>
          </Entry>
        </div>
      </div>
    </main>
  );
}

// A small SVG sparkline of daily average valence (-2..+2). One day → a single dot;
// many days → a connected line. Built only from real mood check-ins.
function MoodCurve({ days }: { days: DayMood[] }) {
  const W = 280, H = 70, padX = 14, padTop = 12, padBot = 22;
  const n = days.length;
  const x = (i: number) => (n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1));
  const y = (avg: number) => padTop + ((2 - avg) / 4) * (H - padTop - padBot); // +2→top, -2→bottom
  const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.avg).toFixed(1)}`).join(" ");
  // label every day when few; otherwise just first + last to avoid crowding
  const showLabel = (i: number) => n <= 6 || i === 0 || i === n - 1;
  return (
    <svg data-testid="mood-curve" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${n} 天的情绪曲线`} style={{ display: "block" }}>
      {/* neutral baseline (valence 0) */}
      <line x1={padX} y1={y(0)} x2={W - padX} y2={y(0)} stroke="rgba(255,255,255,.08)" strokeDasharray="3 4" />
      {n > 1 && <polyline points={pts} fill="none" stroke="var(--gold-deep)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />}
      {days.map((d, i) => (
        <g key={d.dayKey}>
          <circle cx={x(i)} cy={y(d.avg)} r={3.2} fill="var(--gold-soft)" />
          <text x={x(i)} y={y(d.avg) - 7} textAnchor="middle" fontSize="11">{faceForAvg(d.avg)}</text>
          {showLabel(i) && <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="8.5" fill="var(--mute)">{shortDay(d.dayKey)}</text>}
        </g>
      ))}
    </svg>
  );
}

function Entry({ children, dot, last }: { children: React.ReactNode; dot: string; last?: boolean }) {
  return (
    <div style={{ position: "relative", marginBottom: last ? 0 : 20 }}>
      <span style={{ position: "absolute", left: -18, top: 4, width: 9, height: 9, borderRadius: "50%", background: dot, boxShadow: `0 0 8px ${dot}` }} />
      <div style={{ background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, padding: "13px 15px" }}>{children}</div>
    </div>
  );
}
