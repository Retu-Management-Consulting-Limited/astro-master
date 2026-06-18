"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

// Internal-test dashboard. Cookie session login (ADMIN_PASSWORD or ADMIN_SECRET)
// → renders funnel conversion, AI coverage, feature usage, and feedback.
// Not part of the product; for the operator only.

interface Ev { type: string; ts?: number; ai?: boolean; id?: string }
interface Tester { id: string; profile?: { name?: string; ascSign?: string; firstSeen?: number; lastSeen?: number }; events: Ev[] }
interface Feedback { testerId: string; text: string; page?: string; ts?: number }
interface Data { count: number; testers: Tester[]; feedback: Feedback[] }

const has = (t: Tester, type: string) => t.events?.some((e) => e.type === type);
// tester-name filter — CJK literals are data-matching patterns, not UI copy.
const isTest = (name?: string) => !!name && /云测|测试|test/i.test(name); // i18n-allow-cjk: 测试者名过滤模式，非 UI 文案
const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString("zh-CN", { hour12: false }) : "—");

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking cookie
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [hideTest, setHideTest] = useState(true);

  // try the session cookie on mount
  async function loadData() {
    setErr("");
    try {
      const r = await fetch("/api/admin/export");
      if (r.ok) {
        setData(await r.json());
        setAuthed(true);
      } else {
        setAuthed(false);
      }
    } catch {
      setErr(t("errNetwork"));
      setAuthed(false);
    }
  }
  useEffect(() => {
    loadData();
  }, []);

  async function doLogin() {
    if (!pw) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        setPw("");
        await loadData();
      } else {
        setErr(t("errWrongPassword"));
      }
    } catch {
      setErr(t("errNetwork"));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setData(null);
    setAuthed(false);
  }

  const view = useMemo(() => {
    if (!data) return null;
    const testers = hideTest ? data.testers.filter((t) => !isTest(t.profile?.name)) : data.testers;
    const feedback = hideTest ? data.feedback.filter((f) => !/kv-test/.test(f.text)) : data.feedback;
    const nameOf = new Map(data.testers.map((t) => [t.id, t.profile?.name]));

    const steps = [
      { id: "enter", test: (tr: Tester) => tr.events.length > 0 },
      { id: "input", test: (tr: Tester) => has(tr, "funnel_input") },
      { id: "calibration", test: (tr: Tester) => has(tr, "funnel_calibration") },
      { id: "firstRead", test: (tr: Tester) => has(tr, "first_read") },
      { id: "activated", test: (tr: Tester) => has(tr, "activated") },
    ].map((s) => ({ id: s.id, n: testers.filter(s.test).length }));
    const top = steps[0]?.n || 0;

    const withFR = testers.filter((t) => has(t, "first_read"));
    const aiReal = withFR.filter((t) => t.events.some((e) => e.type === "first_read" && e.ai === true)).length;

    const feat = (type: string) => testers.filter((t) => has(t, type)).length;

    return {
      testers,
      feedback,
      nameOf,
      steps,
      top,
      aiReal,
      frTotal: withFR.length,
      features: [
        { id: "themeView", n: feat("theme_view") },
        { id: "chat", n: feat("chat_send") },
        { id: "share", n: feat("share") },
      ],
    };
  }, [data, hideTest]);

  const cardBg = { background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, padding: 16 } as const;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--void, #07090f)", color: "var(--cream)", fontFamily: "var(--sans)", padding: "28px 20px 60px", maxWidth: 780, margin: "0 auto" }}>
      <div className="starfield" />
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--gold)", marginBottom: 4 }}>{t("title")}</h1>
      <p style={{ fontSize: 12.5, color: "var(--mute)", marginBottom: 20 }}>{t("subtitle")}</p>

      {/* checking cookie */}
      {authed === null && <div style={{ fontSize: 13, color: "var(--mute)" }}>{t("checkingLogin")}</div>}

      {/* login gate */}
      {authed === false && (
        <div style={{ ...cardBg, maxWidth: 360 }}>
          <div style={{ fontSize: 13, color: "var(--cream-dim)", marginBottom: 10 }}>{t("passwordPrompt")}</div>
          <div style={{ display: "flex", gap: 9 }}>
            <input type="password" value={pw} autoFocus onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder={t("passwordPlaceholder")}
              style={{ flex: 1, background: "var(--void2, #0c111d)", border: "1px solid var(--field-bd)", borderRadius: 10, padding: "11px 14px", color: "var(--cream)", fontSize: 14, outline: "none" }} />
            <button onClick={doLogin} disabled={loading || !pw} style={{ border: "none", borderRadius: 10, padding: "0 20px", fontSize: 14, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", cursor: "pointer", opacity: loading || !pw ? 0.5 : 1 }}>{loading ? t("loginBtnLoading") : t("loginBtn")}</button>
          </div>
          {err && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 12 }}>{t("sessionHint")}</div>
        </div>
      )}

      {authed && err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {authed && view && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, fontSize: 12.5, color: "var(--cream-dim)" }}>
            <span>{t("statTesters")} <b style={{ color: "var(--gold)", fontSize: 18 }}>{view.testers.length}</b></span>
            <span>{t("statActivated")} <b style={{ color: "var(--green)", fontSize: 18 }}>{view.steps[4]?.n ?? 0}</b></span>
            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--mute)" }}>
              <input type="checkbox" checked={hideTest} onChange={(e) => setHideTest(e.target.checked)} /> {t("hideTestData")}
            </label>
            <button onClick={loadData} style={{ background: "none", border: "1px solid var(--field-bd)", borderRadius: 8, color: "var(--cream-dim)", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>{t("refresh")}</button>
            <button onClick={logout} style={{ background: "none", border: "1px solid var(--field-bd)", borderRadius: 8, color: "var(--mute)", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>{t("logout")}</button>
          </div>

          {/* funnel */}
          <div style={{ ...cardBg, marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>{t("funnelHeading")}</div>
            {view.steps.map((s, i) => {
              const pct = view.top ? Math.round((s.n / view.top) * 100) : 0;
              const stepPct = i > 0 && view.steps[i - 1].n ? Math.round((s.n / view.steps[i - 1].n) * 100) : null;
              return (
                <div key={s.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: "var(--cream-dim)" }}>{t(`steps.${s.id}`)}</span>
                    <span style={{ marginLeft: "auto", color: "var(--cream)" }}><b>{s.n}</b> <span style={{ color: "var(--mute)", fontSize: 11.5 }}>({pct}%{stepPct !== null ? t("funnelPrevStep", { pct: stepPct }) : ""})</span></span>
                  </div>
                  <div style={{ height: 8, background: "#161b29", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: i === 4 ? "linear-gradient(90deg,#3fa860,#7fd99a)" : "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI coverage + features */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={cardBg}>
              <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>{t("aiCoverageHeading")}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: "var(--green)" }}>{view.frTotal ? Math.round((view.aiReal / view.frTotal) * 100) : 0}%</div>
              <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>{t("aiCoverageNote", { real: view.aiReal, total: view.frTotal })}</div>
            </div>
            <div style={cardBg}>
              <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>{t("featuresHeading")}</div>
              {view.features.map((f) => (
                <div key={f.id} style={{ display: "flex", fontSize: 13, marginBottom: 6, color: "var(--cream-dim)" }}>{t(`features.${f.id}`)}<b style={{ marginLeft: "auto", color: "var(--cream)" }}>{f.n}</b></div>
              ))}
            </div>
          </div>

          {/* feedback */}
          <div style={{ ...cardBg, marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>{t("feedbackHeading", { count: view.feedback.length })}</div>
            {view.feedback.length === 0 && <div style={{ fontSize: 13, color: "var(--mute)" }}>{t("feedbackEmpty")}</div>}
            {view.feedback.map((f, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < view.feedback.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                <div style={{ fontSize: 14, color: "var(--cream)", lineHeight: 1.5 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 4 }}>{view.nameOf.get(f.testerId) ?? f.testerId.slice(0, 6)} · {f.page ?? "—"} · {fmt(f.ts)}</div>
              </div>
            ))}
          </div>

          {/* testers */}
          <div style={cardBg}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>{t("testersHeading")}</div>
            {view.testers.map((tester) => (
              <div key={tester.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>
                <span style={{ color: "var(--cream)", minWidth: 80 }}>{tester.profile?.name ?? t("unnamed")}</span>
                <span style={{ color: "var(--mute)", fontSize: 12 }}>{tester.profile?.ascSign ? t("ascPrefix", { sign: tester.profile.ascSign }) : ""}</span>
                <span style={{ marginLeft: "auto", color: has(tester, "activated") ? "var(--green)" : "var(--mute)", fontSize: 11.5 }}>{has(tester, "activated") ? t("activated") : t("notActivated")} · {t("eventCount", { count: tester.events.length })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
