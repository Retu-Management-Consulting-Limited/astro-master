"use client";
import type { TimeBelief } from "@/lib/astro/timeBelief";
import { detectiveBandCopy } from "@/lib/reading/calibrationSignal";

// ── 时辰侦探 (Time Detective) ─────────────────────────────────────────────────
// design/22-calibration-options.html · T-Q2:C — the "让越用越准可感" surface.
// A 24h clock bar with the belief's topRange highlighted + a lock readout, so the
// abstract "盘在变准" becomes a thing she can SEE narrow: 24h → a handful of hours.
//
// Honesty (charter §5.2 镜子非算命, 真vs编):
//   • The highlighted band and the readout are derived from belief.topRange — the
//     real window her events narrowed — never a fixed mad-lib.
//   • A WIDE / low-confidence belief is told the truth: the band fills (most of) the
//     clock and the copy says it's still wide, asking for one more 大事 rather than
//     faking precision. The spoken line is detectiveBandCopy(belief), the single
//     charter-clean source (registered strong-form in content-freshness.test.ts).
//   • We never announce an exact birth minute — only a hedged span.
// This component is pure/presentational: belief in → DOM out. It carries no routing
// or store coupling so it can sit on onboarding揭晓 and "我的"回看 alike.

const HOURS = 24;

// Wrap-aware coverage: which of the 24 hour-buckets fall inside [lo,hi] (inclusive),
// handling a band that crosses midnight (e.g. [21,11] = 21,22,23,0,…,11).
export function bandCovers(lo: number, hi: number, hour: number): boolean {
  const h = ((hour % HOURS) + HOURS) % HOURS;
  const a = ((lo % HOURS) + HOURS) % HOURS;
  const b = ((hi % HOURS) + HOURS) % HOURS;
  return a <= b ? h >= a && h <= b : h >= a || h <= b;
}

// Span width in hours (wrap-aware), matching detectiveBandCopy's count.
function spanHours(lo: number, hi: number): number {
  return ((hi - lo + HOURS) % HOURS) || HOURS;
}

// The short lock label that points at the band ("已锁到 X 小时内" / "还很宽").
// Width-only, intentionally terse — the full honest sentence is the copy line below.
export function lockLabel(belief: TimeBelief): string {
  const [lo, hi] = belief.topRange;
  const hours = spanHours(lo, hi);
  if (belief.confidence < 0.15 || hours >= 20) return "还很宽 · 多补一件大事能更准";
  return `已锁到 ${hours} 小时内`;
}

export function TimeDetective({ belief }: { belief: TimeBelief }) {
  const [lo, hi] = belief.topRange;
  const hours = spanHours(lo, hi);
  const wide = belief.confidence < 0.15 || hours >= 20;
  const copy = detectiveBandCopy(belief);

  return (
    <div
      data-testid="time-detective"
      data-lo={lo}
      data-hi={hi}
      data-hours={hours}
      data-wide={wide ? "1" : "0"}
      style={{
        background: "var(--field)",
        border: "1px solid var(--field-bd)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--cream)", marginBottom: 4 }}>我在帮你找回出生时刻</div>
      <div data-testid="td-lock" style={{ fontSize: 11, color: wide ? "var(--mute)" : "var(--gold-soft)", marginBottom: 14 }}>
        {lockLabel(belief)}
      </div>

      {/* 24h band — each hour-bucket is a cell; the belief's topRange lights up gold. */}
      <div
        role="img"
        aria-label={wide ? "出生时辰还很宽，覆盖大半天" : `出生时辰锁定在 ${hours} 小时内`}
        style={{ display: "flex", gap: 1, height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid var(--field-bd)" }}
      >
        {Array.from({ length: HOURS }).map((_, h) => {
          const on = bandCovers(lo, hi, h);
          return (
            <span
              key={h}
              data-testid="td-hour"
              data-hour={h}
              data-on={on ? "1" : "0"}
              style={{
                flex: 1,
                background: on ? "rgba(201,168,97,.32)" : "#141a28",
                boxShadow: on ? "inset 0 0 0 1px rgba(201,168,97,.45)" : "none",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--mute)", marginTop: 5 }}>
        <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
      </div>

      <div data-testid="td-copy" style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.5, marginTop: 14 }}>
        {copy}
      </div>
      <div style={{ fontSize: 10.5, color: "#5a6173", marginTop: 8 }}>
        我不是算命——是用你真实经历对天象，反推时辰。
      </div>
    </div>
  );
}
