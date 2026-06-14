"use client";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { daysSince } from "@/lib/relationship";
import { useUnderstanding } from "@/lib/understanding";
import { BackButton } from "@/components/BackButton";

export default function HistoryPage() {
  const { chart, ready } = useChartGuard();
  const firstRead = useFunnel((s) => s.firstRead);
  const nickname = useFunnel((s) => s.nickname);
  const joinedAt = useFunnel((s) => s.joinedAt);
  const understand = useUnderstanding();
  if (!ready || !chart) return null;

  const days = daysSince(joinedAt);
  const quote = firstRead?.quote ?? "你最大的本事，是让所有人都以为你不需要任何人。";

  return (
    <main className="phone" data-testid="history">
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
              满 <b style={{ color: "var(--cream)" }}>30 天</b>，我会把这个月你走过的情绪，连成一条线给你看。<br />
              满 <b style={{ color: "var(--cream)" }}>一年</b>，我会在每个「一年前的今天」，提醒你——你当时在怕什么，后来又怎么走过来了。
            </div>
            <div style={{ fontSize: 11.5, color: "var(--gold-soft)", marginTop: 10 }}>所以别走丢。每天来一下，这条路才连得起来。</div>
          </Entry>
        </div>
      </div>
    </main>
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
