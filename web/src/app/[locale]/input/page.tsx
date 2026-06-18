"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { computeChart } from "@/lib/astro/chart";
import { useFunnel } from "@/lib/store";
import { resolveBirth } from "@/lib/birth";
import { BirthDateField } from "@/components/BirthDateField";
import { validBirthDateTime } from "@/lib/astro/birthdate";
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
  const t = useTranslations("input");
  const router = useRouter();
  const setChart = useFunnel((s) => s.setChart);
  const setGender = useFunnel((s) => s.setGender);
  const [date, setDate] = useState("1998-06-13");
  const [time, setTime] = useState("");
  // 默认「不知道准确时间」→ 正午盘（诚实默认，不预填假精确值）。用户主动勾
  // 「我知道准确的出生时间」才启用填写。注：knownTime===true 表示"未知"（见 birth.ts）。
  const [knownTime, setKnownTime] = useState(true);
  const [country, setCountry] = useState(t("defaultCountry"));
  const [city, setCity] = useState(t("defaultCity"));
  const [gender, setG] = useState<"female" | "male">("female");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setErr(null);
    // Field-specific validation (M1: don't blame "city" for a bad date; M6/L1:
    // no future / pre-1900 dates).
    if (!date) { setErr(t("errMissingDate")); return; }
    if (!knownTime && !time) { setErr(t("errMissingTime")); return; }
    if (!validBirthDateTime(date, knownTime ? undefined : time)) {
      setErr(t("errBadDate"));
      return;
    }
    if (!city.trim()) { setErr(t("errMissingCity")); return; }
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
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="fadein">
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
          <Dots active={0} />
        </div>

        <div className="reveal" style={{ marginTop: 46, animationDelay: ".3s" }}>
          <div style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontWeight: 500, fontSize: 34, lineHeight: 1.3 }}>
            {t("headlineLine1")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("headlineLine2")}</span>
          </div>
          <p style={{ marginTop: 14, fontWeight: 300, fontSize: 14.5, lineHeight: 1.7, color: "var(--cream-dim)" }}>{t("subtitle")}</p>
        </div>

        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="reveal" style={{ animationDelay: ".5s" }}>
            <label style={lbl}>{t("genderLabel")}</label>
            <div style={{ display: "flex", gap: 10 }} data-testid="gender-pick">
              {([["female", t("genderFemale")], ["male", t("genderMale")]] as const).map(([g, label]) => (
                <button key={g} type="button" data-testid={`gender-${g}`} aria-pressed={gender === g} onClick={() => setG(g)} style={{ flex: 1, padding: "11px 0", borderRadius: 11, fontSize: 14, cursor: "pointer", border: gender === g ? "1px solid var(--gold)" : "1px solid var(--field-bd)", background: gender === g ? "rgba(201,168,97,.14)" : "var(--field)", color: gender === g ? "var(--gold-soft)" : "var(--cream-dim)", fontWeight: gender === g ? 600 : 400 }}>{label}</button>
              ))}
            </div>
          </div>
          <div className="reveal" style={{ animationDelay: ".55s" }}>
            <label style={lbl} htmlFor="birth-year">{t("dateLabel")}</label>
            <BirthDateField idPrefix="birth" value={date} onChange={setDate} />
          </div>
          <div className="reveal" style={{ animationDelay: ".7s" }}>
            <label style={lbl} htmlFor="birth-time">{t("timeLabel")}</label>
            <input id="birth-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
            <button type="button" role="checkbox" aria-checked={!knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "10px 0", textAlign: "left" }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", position: "relative", background: !knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{!knownTime ? "✓" : ""}</span>
              <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>{t("knownTimeCheckbox")}</span>
            </button>
            {knownTime && <p style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6, marginTop: 8 }}>{t("unknownTimeHintBefore")}<b style={{ color: "var(--cream-dim)", fontWeight: 400 }}>{t("unknownTimeHintNoon")}</b>{t("unknownTimeHintAfter")}</p>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="reveal" style={{ flex: 1, animationDelay: ".85s" }}>
              <label style={lbl} htmlFor="birth-country">{t("countryLabel")}</label>
              <input id="birth-country" className="field-inp" type="text" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="reveal" style={{ flex: 1, animationDelay: ".85s" }}>
              <label style={lbl} htmlFor="birth-city">{t("cityLabel")}</label>
              <input id="birth-city" className="field-inp" type="text" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} style={{ borderColor: err ? "var(--red)" : undefined }} />
            </div>
          </div>
          {err && <div role="alert" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err} {t("errCityHint")}</div>}
        </div>

        <div className="reveal" style={{ marginTop: "auto", animationDelay: "1s" }}>
          <button className="gold-btn" onClick={submit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>{loading ? t("submitLoading") : t("submit")}</button>
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11.5, color: "var(--mute)" }}>{t("privacyNote")}</div>
        </div>
      </div>
    </main>
  );
}
