"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeChart } from "@/lib/astro/chart";
import { useFunnel } from "@/lib/store";
import { resolveBirth } from "@/lib/birth";
import { track } from "@/lib/track";

function Dots({ active }: { active: number }) {
  return (
    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", display: "block", background: i <= active ? "var(--gold)" : "#2a3142", boxShadow: i <= active ? "0 0 8px var(--gold)" : "none" }} />
      ))}
    </div>
  );
}

export default function InputPage() {
  const router = useRouter();
  const setChart = useFunnel((s) => s.setChart);
  const setGender = useFunnel((s) => s.setGender);
  const [date, setDate] = useState("1998-06-13");
  const [time, setTime] = useState("08:40");
  const [knownTime, setKnownTime] = useState(false);
  const [country, setCountry] = useState("澳大利亚");
  const [city, setCity] = useState("墨尔本");
  const [gender, setG] = useState<"female" | "male">("female");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      const form = { date, time, knownTime, country, city };
      const r = await resolveBirth(form);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      setGender(gender);
      setChart(r.birth, form, computeChart(r.birth));
      track("funnel_input", { knownTime, gender });
      router.push("/calibration");
    } finally {
      setLoading(false);
    }
  }

  const lbl = { display: "block", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--gold)", marginBottom: 9, fontWeight: 500 };

  return (
    <main className="phone">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="fadein">
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
          <Dots active={0} />
        </div>

        <div className="reveal" style={{ marginTop: 46, animationDelay: ".3s" }}>
          <div style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 34, lineHeight: 1.3 }}>
            你出生的那一刻，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>藏着整个你。</span>
          </div>
          <p style={{ marginTop: 14, fontWeight: 300, fontSize: 14.5, lineHeight: 1.7, color: "var(--cream-dim)" }}>告诉我准确的时间和地点——越准，我看得越深。</p>
        </div>

        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="reveal" style={{ animationDelay: ".5s" }}>
            <label style={lbl}>你是</label>
            <div style={{ display: "flex", gap: 10 }} data-testid="gender-pick">
              {([["female", "女"], ["male", "男"]] as const).map(([g, t]) => (
                <button key={g} type="button" data-testid={`gender-${g}`} aria-pressed={gender === g} onClick={() => setG(g)} style={{ flex: 1, padding: "11px 0", borderRadius: 11, fontSize: 14, cursor: "pointer", border: gender === g ? "1px solid var(--gold)" : "1px solid var(--field-bd)", background: gender === g ? "rgba(201,168,97,.14)" : "var(--field)", color: gender === g ? "var(--gold-soft)" : "var(--cream-dim)", fontWeight: gender === g ? 600 : 400 }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="reveal" style={{ animationDelay: ".55s" }}>
            <label style={lbl} htmlFor="birth-date">出生日期</label>
            <input id="birth-date" className="field-inp" type="date" autoComplete="bday" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="reveal" style={{ animationDelay: ".7s" }}>
            <label style={lbl} htmlFor="birth-time">出生时间</label>
            <input id="birth-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
            <button type="button" role="checkbox" aria-checked={knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", position: "relative", background: knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{knownTime ? "✓" : ""}</span>
              <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>我不知道准确时间 —— <b style={{ color: "var(--irisc)", fontWeight: 400 }}>没关系，待会几个问题帮你校准</b></span>
            </button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="reveal" style={{ flex: 1, animationDelay: ".85s" }}>
              <label style={lbl} htmlFor="birth-country">国家</label>
              <input id="birth-country" className="field-inp" type="text" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="reveal" style={{ flex: 1, animationDelay: ".85s" }}>
              <label style={lbl} htmlFor="birth-city">城市</label>
              <input id="birth-city" className="field-inp" type="text" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} style={{ borderColor: err ? "var(--red)" : undefined }} />
            </div>
          </div>
          {err && <div style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err} —— 试试：墨尔本 / 上海 / 纽约 / 伦敦</div>}
        </div>

        <div className="reveal" style={{ marginTop: "auto", animationDelay: "1s" }}>
          <button className="gold-btn" onClick={submit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>{loading ? "正在定位你的星空…" : "让 Molly 看你的盘 →"}</button>
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11.5, color: "var(--mute)" }}>🔒 只用来排你的盘 · 永远不会公开</div>
        </div>
      </div>
    </main>
  );
}
