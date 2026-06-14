"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeChart } from "@/lib/astro/chart";
import { useFunnel, snapshotOf } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { resolveBirth } from "@/lib/birth";
import { apiSync } from "@/lib/auth-client";
import { BackButton } from "@/components/BackButton";
import { track } from "@/lib/track";

// View + edit the user's own birth data. A change re-resolves through
// /api/geocode (correct historical offset) and recomputes the chart, then syncs
// to the account if logged in. joinedAt is preserved (setChart keeps it).
export default function EditBirthPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const birthForm = useFunnel((s) => s.birthForm);
  const setChart = useFunnel((s) => s.setChart);

  const [date, setDate] = useState(birthForm?.date ?? "1998-06-13");
  const [time, setTime] = useState(birthForm?.time ?? "08:40");
  const [knownTime, setKnownTime] = useState(birthForm?.knownTime ?? false);
  const [country, setCountry] = useState(birthForm?.country ?? "");
  const [city, setCity] = useState(birthForm?.city ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ready || !chart) return null;

  async function save() {
    if (saving) return;
    setErr(null);
    setSaving(true);
    try {
      const form = { date, time, knownTime, country, city };
      const r = await resolveBirth(form);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      setChart(r.birth, form, computeChart(r.birth));
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
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>出生信息</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "12px 30px 30px" }}>
        <p style={{ fontWeight: 300, fontSize: 13.5, lineHeight: 1.7, color: "var(--cream-dim)", marginBottom: 22 }}>
          改对了，我会立刻为你重新排盘。出生地或时间一变，整张盘都会跟着更新。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={lbl} htmlFor="edit-date">出生日期</label>
            <input id="edit-date" className="field-inp" type="date" autoComplete="bday" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={lbl} htmlFor="edit-time">出生时间</label>
            <input id="edit-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
            <button type="button" role="checkbox" aria-checked={knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", background: knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{knownTime ? "✓" : ""}</span>
              <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>我不知道准确时间（按正午估算）</span>
            </button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl} htmlFor="edit-country">国家</label>
              <input id="edit-country" className="field-inp" type="text" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl} htmlFor="edit-city">城市</label>
              <input id="edit-city" className="field-inp" data-testid="edit-city" type="text" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} style={{ borderColor: err ? "var(--red)" : undefined }} />
            </div>
          </div>
          {err && <div data-testid="edit-err" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err} —— 试试附近的大城市</div>}
        </div>

        <div style={{ marginTop: "auto" }}>
          <button className="gold-btn" data-testid="save-birth" onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? "正在重新排盘…" : "保存并重新排盘"}</button>
        </div>
      </div>
    </main>
  );
}
