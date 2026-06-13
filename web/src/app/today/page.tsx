"use client";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { TabBar } from "@/components/TabBar";
import { dayWealth } from "@/lib/astro/wealth";

export default function TodayPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  if (!ready || !chart) return null;

  const moon = chart.placements.find((p) => p.body === "Moon");
  const tw = dayWealth(chart, 2026, 6, 13);
  const fortune = tw.level === "wang"
    ? { c: "var(--green)", b: "#a8e0bf", label: "旺", txt: "该收的款、该谈的薪今天去推" }
    : tw?.level === "shen"
    ? { c: "var(--red)", b: "#f0a8a5", label: "慎", txt: "今天别冲动消费，想下单先睡一觉" }
    : { c: "var(--blue)", b: "#cfe0f0", label: "平", txt: "钱上没大事，按计划走就好" };

  return (
    <main className="phone" data-testid="today">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "24px 22px 10px" }}>
        <div className="eye-mini" />
        <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--cream-dim)" }}>
          懂你 <span style={{ width: 40, height: 4, background: "#1d2333", borderRadius: 3, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: "62%", background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} /></span> <b style={{ color: "var(--gold)" }}>62%</b> ↑
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "8px 20px 12px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", fontWeight: 500, margin: "6px 4px 12px" }}>
          {nickname ?? "你"}，<i style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>我有三句话</i>给你。
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(143,182,216,.07)", border: "1px solid rgba(143,182,216,.18)", borderRadius: 11, padding: "9px 12px", fontSize: 12.5, color: "var(--blue)", marginBottom: 16 }}>
          🌙 <span>月亮入{moon?.sign ?? "天蝎"} · <b style={{ color: "#cfe0f0" }}>情绪偏深</b>，今天宜独处、忌硬撑</span>
        </div>

        {/* 昨 */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(143,182,216,.28)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--blue)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} />昨天 · 你说中了吗<span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: 0, color: "var(--green)", textTransform: "none" }}>答对 +1% 校准</span></div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>我说你昨天会<b style={{ color: "var(--cream)" }}>特别想抓住一个确定的答案</b>——对吗？</div>
          <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
            <span style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: "1px solid rgba(127,201,154,.4)", background: "rgba(127,201,154,.12)", color: "var(--green)" }}>嗯，是这样 ✓</span>
            <span style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: 8, fontSize: 12.5, border: "1px solid #2b3a4e", color: "#a9c4dd" }}>其实没有</span>
          </div>
        </div>

        {/* 今 hero */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(201,168,97,.4)", background: "linear-gradient(180deg, rgba(201,168,97,.07), rgba(201,168,97,.02))", boxShadow: "0 0 30px -12px rgba(201,168,97,.4)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--gold)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} />今天</div>
          <div style={{ fontSize: 15.5, color: "var(--cream)", lineHeight: 1.68 }}>金星刑你的天顶——<b style={{ color: "var(--gold-soft)" }}>今天别急着在工作上表态</b>。有人会试探你的底，沉住气，话留三分。</div>
          <div style={{ marginTop: 11, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--gold-soft)", lineHeight: 1.5 }}>这不是坏日子，是宇宙让你先稳住自己。</div>
          <div onClick={() => router.push("/wealth")} data-testid="fortune-chip" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, padding: "9px 12px", borderRadius: 11, background: "rgba(127,201,154,.07)", border: `1px solid ${fortune.c}55`, fontSize: 12.5, color: fortune.c, cursor: "pointer" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: fortune.c, boxShadow: `0 0 8px ${fortune.c}` }} /><span>今日财运 <b style={{ color: fortune.b }}>{fortune.label}</b> · {fortune.txt}</span><span style={{ marginLeft: "auto", color: "#5f8f73" }}>查日历 →</span>
          </div>
        </div>

        {/* 明 */}
        <div style={{ borderRadius: 17, padding: "15px 16px", marginBottom: 12, border: "1px solid rgba(181,143,176,.26)", background: "var(--field)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 9, color: "var(--irisc)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--irisc)" }} />明天</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--cream-dim)" }}>明早，月亮合你的金星——<b style={{ color: "#d6b8d2" }}>一道难得的温柔相位</b>。记得回来，我有话想跟你说。🔮</div>
        </div>

        {/* 心情打卡 */}
        <div style={{ marginTop: 4, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 17, padding: "14px 16px" }}>
          <div style={{ fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 11 }}>此刻的你，是哪一种？</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["😌", "😮‍💨", "😔", "🔥", "🌧️"].map((e) => <div key={e} style={{ width: 46, height: 46, borderRadius: "50%", background: "#161b29", border: "1px solid #2b3242", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{e}</div>)}
          </div>
        </div>
      </div>

      <TabBar active="today" />
    </main>
  );
}
