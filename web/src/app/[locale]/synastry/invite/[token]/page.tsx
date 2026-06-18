"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { computeChart, type Chart } from "@/lib/astro/chart";
import { isFullChart } from "@/lib/astro/chart-validate";
import { resolveBirth } from "@/lib/birth";
import { BirthDateField } from "@/components/BirthDateField";
import { synastry, type RelType } from "@/lib/astro/synastry";
import { synScaffold, type SynRead } from "@/lib/reading/synastry";
import { fetchSynastryRead } from "@/lib/reading/remote";

const DIM_COLOR = ["#e69ec8", "#f0a868", "#8fb6d8", "#e0c98a", "#7fc99a"];

// Person B's landing page from a synastry invite link. They fill in their real
// birth data; we resolve it (same correct-offset path as /input) and submit the
// computed chart back. Then B ALSO sees the synastry (from B's perspective) and
// is nudged to look at their own natal chart (PR6 / Unit H).
export default function InvitePage() {
  const t = useTranslations("synastry");
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [inviter, setInviter] = useState<string | null>(null);
  const [type, setType] = useState<RelType | null>(null);
  const [inviterChart, setInviterChart] = useState<Chart | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(""); // no fake default — must be the partner's real date (B4)
  const [time, setTime] = useState("");
  const [knownTime, setKnownTime] = useState(true); // 默认未知→正午（诚实默认，不诱导填假精确时间）
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myChart, setMyChart] = useState<Chart | null>(null);
  const [myName, setMyName] = useState(t("invite.fallbackMyName"));

  useEffect(() => {
    if (!token) return;
    fetch(`/api/synastry/invite?token=${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        setInviter((typeof j.inviterName === "string" && j.inviterName.trim()) || t("invite.fallbackInviter"));
        if (j.type) setType(j.type as RelType);
        if (isFullChart(j.inviterChart)) setInviterChart(j.inviterChart as Chart);
      })
      .catch(() => setInvalid(true));
  }, [token]);

  async function submit() {
    if (busy) return;
    setErr(null);
    if (!date || (!knownTime && !time) || !city.trim()) {
      setErr(t("invite.errMissing"));
      return;
    }
    setBusy(true);
    try {
      const form = { date, time: knownTime ? "12:00" : time, knownTime, country, city };
      const r = await resolveBirth(form);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      const chart = computeChart(r.birth);
      const res = await fetch("/api/synastry/invite/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() || undefined, chart, birthForm: form }),
      });
      if (!res.ok) {
        setErr(t("invite.errExpired"));
        return;
      }
      setMyName(name.trim() || t("invite.fallbackMyName"));
      setMyChart(chart);
    } catch {
      setErr(t("invite.errNetwork"));
    } finally {
      setBusy(false);
    }
  }

  const lbl = { display: "block", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--gold)", marginBottom: 9, fontWeight: 500 };
  // B-5 is only possible when A's invite carried a (valid) chart + type (PR1.5/D3).
  // Older invites lack them → graceful thanks-only screen.
  const canResult = !!(myChart && inviterChart && type);

  return (
    <main className="phone" data-testid="syn-invite">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>{t("invite.brand")}</span>
        </div>

        {invalid ? (
          <div style={{ marginTop: 60, textAlign: "center", color: "var(--cream-dim)" }} data-testid="invite-invalid">{t("invite.invalid")}</div>
        ) : myChart && canResult ? (
          <BResult myChart={myChart} myName={myName} otherChart={inviterChart!} otherName={inviter ?? t("invite.fallbackInviter")} type={type!} />
        ) : myChart ? (
          // fallback: A's invite predates chart/type → can't show B the synastry here.
          <div style={{ marginTop: 60, textAlign: "center" }} data-testid="invite-done">
            <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", lineHeight: 1.4 }}>{t("invite.doneTitle")}</div>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.7 }}>{inviter}{t("invite.doneBodyBefore")}<br />{t("invite.doneBodyQuestion")}</p>
            <Link href="/" style={{ display: "inline-block", marginTop: 20, color: "var(--gold-soft)", fontSize: 14 }}>{t("invite.seeMeLink")}</Link>
          </div>
        ) : (
          <>
            <div className="reveal" style={{ marginTop: 36, fontFamily: "var(--serif)", fontSize: 28, color: "var(--cream)", fontWeight: 500, lineHeight: 1.36 }}>
              <span style={{ color: "var(--gold-soft)" }}>{inviter ?? t("invite.fallbackInviterAlt")}</span>{t("invite.headingWith")}<br />
              {type ? (
                <>{t("invite.headingTypeBefore")}<span style={{ fontStyle: "italic", color: "var(--gold-soft)" }}>{t("invite.headingType", { rel: t(`shortRel.${type}`) })}</span>{t("invite.headingTypeAfter")}</>
              ) : (
                <span style={{ fontStyle: "italic", color: "var(--gold-soft)" }}>{t("invite.headingNoType")}</span>
              )}
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.7 }}>{t("invite.privacyBefore")}<b style={{ color: "var(--cream)", fontWeight: 400 }}>{t("invite.privacyEmphasis")}</b>{t("invite.privacyAfter")}</p>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl} htmlFor="inv-name">{t("invite.nameLabel")}</label>
                <input id="inv-name" className="field-inp" data-testid="inv-name" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("invite.namePlaceholder")} />
              </div>
              <div>
                <label style={lbl} htmlFor="inv-year">{t("invite.dateLabel")}</label>
                <BirthDateField idPrefix="inv" value={date} onChange={setDate} />
              </div>
              <div>
                <label style={lbl} htmlFor="inv-time">{t("invite.timeLabel")}</label>
                <input id="inv-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
                <button type="button" role="checkbox" aria-checked={!knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "10px 0" }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", background: !knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{!knownTime ? "✓" : ""}</span>
                  <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>{t("invite.knownTimeLabel")}</span>
                </button>
                {knownTime && <p style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6, marginTop: 8 }}>{t("invite.noonNoteBefore")}<b style={{ color: "var(--cream-dim)", fontWeight: 400 }}>{t("invite.noonNoteEmphasis")}</b>{t("invite.noonNoteAfter")}</p>}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl} htmlFor="inv-country">{t("invite.countryLabel")}</label>
                  <input id="inv-country" className="field-inp" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("invite.countryPlaceholder")} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl} htmlFor="inv-city">{t("invite.cityLabel")}</label>
                  <input id="inv-city" className="field-inp" data-testid="inv-city" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} placeholder={t("invite.cityPlaceholder")} />
                </div>
              </div>
              {err && <div data-testid="inv-err" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err}</div>}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 20 }}>
              <button className="gold-btn" data-testid="inv-submit" onClick={submit} disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>{busy ? t("invite.submitBusy") : t("invite.submitBtn")}</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// B-5 + B-6: B sees the synastry from their own perspective, then is nudged to
// their own natal chart. Only the DERIVED pair result is shown — B never sees A's
// raw birth data (§9.3); A's chart arrived as placements only.
function BResult({ myChart, myName, otherChart, otherName, type }: { myChart: Chart; myName: string; otherChart: Chart; otherName: string; type: RelType }) {
  const t = useTranslations("synastry");
  const result = useMemo(() => synastry(myChart, otherChart, type), [myChart, otherChart, type]);
  const [read, setRead] = useState<SynRead>(() => synScaffold(result, myName, otherName));

  useEffect(() => {
    let alive = true;
    fetchSynastryRead(myChart, otherChart, type, myName, otherName).then((r) => {
      if (alive && r) setRead(r);
    });
    return () => {
      alive = false;
    };
  }, [myChart, otherChart, type, myName, otherName]);

  return (
    <div data-testid="invite-result" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", margin: "24px 0 4px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 21, color: "var(--cream)", fontWeight: 500 }}>{t("bresult.names")} <span style={{ color: "var(--gold-deep)" }}>{t("bresult.namesArrow")}</span> <b style={{ color: "var(--gold-soft)" }}>{otherName}</b></div>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", margin: "6px 0 2px" }}>{t(`shortRel.${type}`)}{t("relCardSuffix")} · {t("bresult.compatibility")}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 600, color: "var(--gold)", lineHeight: 1, textShadow: "0 0 30px rgba(201,168,97,.3)" }}>{result.total}<small style={{ fontSize: 22 }}>%</small></div>
        <div style={{ marginTop: 7, fontSize: 12.5, color: "var(--green)" }}>{read.vibe}</div>
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
        {result.dims.map((d, i) => {
          const color = DIM_COLOR[i % DIM_COLOR.length];
          return (
            <div key={d.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cream-dim)", marginBottom: 5 }}><span>{d.label}</span><b style={{ color }}>{d.value}</b></div>
              <div style={{ height: 7, background: "#1b2130", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${d.value}%`, background: color }} /></div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 22 }}>
        <p style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 18, lineHeight: 1.6, color: "var(--cream-dim)", marginBottom: 12 }}>{read.body}</p>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--green)", borderLeft: "2px solid var(--green)", paddingLeft: 13 }}>{read.catchLine}</p>
      </div>

      {/* B-6 conversion: turn the invitee into a user. */}
      <div style={{ marginTop: 26, background: "rgba(201,168,97,.06)", border: "1px solid rgba(201,168,97,.22)", borderRadius: 14, padding: "16px 16px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--cream)", lineHeight: 1.5 }}>{otherName}{t("bresult.convertBefore")}<br />{t("bresult.convertQuestion")}<span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("bresult.convertEmphasis")}</span>{t("bresult.convertAfter")}</div>
        <Link href="/" data-testid="invite-cta" style={{ display: "block", marginTop: 14, background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", color: "#1a1408", fontWeight: 600, borderRadius: 10, padding: "11px 0", fontSize: 14, textDecoration: "none" }}>{t("bresult.convertCta")}</Link>
      </div>
      <div style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "#566073" }}>{t("bresult.disclaimer")}</div>
    </div>
  );
}
