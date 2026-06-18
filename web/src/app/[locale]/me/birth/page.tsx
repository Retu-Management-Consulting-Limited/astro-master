"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { computeChart } from "@/lib/astro/chart";
import { useFunnel, snapshotOf, type BirthForm } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { resolveBirth } from "@/lib/birth";
import { BirthDateField } from "@/components/BirthDateField";
import { apiSync } from "@/lib/auth-client";
import { BackButton } from "@/components/BackButton";
import { track } from "@/lib/track";

// View + edit the user's own birth data. A change re-resolves through
// /api/geocode (correct historical offset) and recomputes the chart, then syncs
// to the account if logged in. joinedAt is preserved (setChart keeps it).
//
// H1 fix: the form is a CHILD mounted only after the chart guard is ready
// (store rehydrated). That way the form's useState initializers read the user's
// REAL stored values — not the demo defaults that the old top-level useState
// locked in on the first (pre-hydration) frame, which then silently overwrote
// year/date/country/gender on a deep-link or PWA cold start.
export default function EditBirthPage() {
  const { chart, ready } = useChartGuard();
  if (!ready || !chart) return null;
  return <EditBirthForm />;
}

function EditBirthForm() {
  const t = useTranslations("me");
  const router = useRouter();
  const birthForm = useFunnel((s) => s.birthForm);
  const storedGender = useFunnel((s) => s.gender);
  const setChart = useFunnel((s) => s.setChart);
  const setGender = useFunnel((s) => s.setGender);
  const setFirstRead = useFunnel((s) => s.setFirstRead);

  const [date, setDate] = useState(birthForm?.date ?? "1998-06-13");
  const [time, setTime] = useState(birthForm?.time ?? "");
  const [knownTime, setKnownTime] = useState(birthForm?.knownTime ?? true); // 默认未知→正午（诚实默认）
  const [country, setCountry] = useState(birthForm?.country ?? "");
  const [city, setCity] = useState(birthForm?.city ?? "");
  const [gender, setG] = useState<"female" | "male">(storedGender ?? "female");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setErr(null);
    setSaving(true);
    try {
      const form: BirthForm = { date, time, knownTime, country, city };
      const r = await resolveBirth(form);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      setGender(gender);
      setChart(r.birth, form, computeChart(r.birth));
      // The chart changed → the old firstRead (self-quote/chips) was generated
      // from the PREVIOUS chart and is now stale. Clear it so "我眼中的你" and
      // chat openers fall back instead of showing the old chart's description;
      // it regenerates next time the user visits /reading.
      setFirstRead(undefined);
      apiSync(snapshotOf(useFunnel.getState())); // persist to account if logged in
      track("birth_edited");
      router.push("/me");
    } finally {
      setSaving(false);
    }
  }

  const lbl = { display: "block", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--gold)", marginBottom: 9, fontWeight: 500 };

  return (
    <main className="phone" data-testid="edit-birth">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("birthSrTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>{t("birthHeader")}</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "12px 30px 30px" }}>
        <p style={{ fontWeight: 300, fontSize: 13.5, lineHeight: 1.7, color: "var(--cream-dim)", marginBottom: 22 }}>
          {t("birthIntro")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={lbl}>{t("genderLabel")}</label>
            <div style={{ display: "flex", gap: 10 }} data-testid="edit-gender">
              {([["female", t("genderFemale")], ["male", t("genderMale")]] as const).map(([g, label]) => (
                <button key={g} type="button" data-testid={`edit-gender-${g}`} aria-pressed={gender === g} onClick={() => setG(g)} style={{ flex: 1, padding: "11px 0", borderRadius: 11, fontSize: 14, cursor: "pointer", border: gender === g ? "1px solid var(--gold)" : "1px solid var(--field-bd)", background: gender === g ? "rgba(201,168,97,.14)" : "var(--field)", color: gender === g ? "var(--gold-soft)" : "var(--cream-dim)", fontWeight: gender === g ? 600 : 400 }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl} htmlFor="edit-year">{t("dateLabel")}</label>
            <BirthDateField idPrefix="edit" value={date} onChange={setDate} />
          </div>
          <div>
            <label style={lbl} htmlFor="edit-time">{t("timeLabel")}</label>
            <input id="edit-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
            <button type="button" role="checkbox" aria-checked={!knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "10px 0", textAlign: "left" }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", background: !knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{!knownTime ? "✓" : ""}</span>
              <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>{t("knownTimeCheckbox")}</span>
            </button>
            {knownTime && <p style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6, marginTop: 8 }}>{t("unknownTimeHintBefore")}<b style={{ color: "var(--cream-dim)", fontWeight: 400 }}>{t("unknownTimeHintNoon")}</b>{t("unknownTimeHintAfter")}</p>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl} htmlFor="edit-country">{t("countryLabel")}</label>
              <input id="edit-country" className="field-inp" type="text" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl} htmlFor="edit-city">{t("cityLabel")}</label>
              <input id="edit-city" className="field-inp" data-testid="edit-city" type="text" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} style={{ borderColor: err ? "var(--red)" : undefined }} />
            </div>
          </div>
          {err && <div data-testid="edit-err" style={{ fontSize: 12.5, color: "var(--red)" }}>{t("errPrefix")} {err} {t("errSuffix")}</div>}
        </div>

        <div style={{ marginTop: "auto" }}>
          <button className="gold-btn" data-testid="save-birth" onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? t("saveLoading") : t("save")}</button>
        </div>
      </div>
    </main>
  );
}
