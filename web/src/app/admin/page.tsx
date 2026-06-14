"use client";
import { useEffect, useMemo, useState } from "react";

// Internal-test dashboard. Cookie session login (ADMIN_PASSWORD or ADMIN_SECRET)
// → renders funnel conversion, AI coverage, feature usage, and feedback.
// Not part of the product; for the operator only.

interface Ev { type: string; ts?: number; ai?: boolean; id?: string }
interface Tester { id: string; profile?: { name?: string; ascSign?: string; firstSeen?: number; lastSeen?: number }; events: Ev[] }
interface Feedback { testerId: string; text: string; page?: string; ts?: number }
interface Data { count: number; testers: Tester[]; feedback: Feedback[] }

const has = (t: Tester, type: string) => t.events?.some((e) => e.type === type);
const isTest = (name?: string) => !!name && /云测|测试|test/i.test(name);
const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString("zh-CN", { hour12: false }) : "—");

export default function AdminDashboard() {
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
      setErr("网络错误");
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
        setErr("密码不对");
      }
    } catch {
      setErr("网络错误");
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
      { label: "进入", test: (t: Tester) => t.events.length > 0 },
      { label: "填出生信息", test: (t: Tester) => has(t, "funnel_input") },
      { label: "答完校准", test: (t: Tester) => has(t, "funnel_calibration") },
      { label: "看到首读", test: (t: Tester) => has(t, "first_read") },
      { label: "激活(注册)", test: (t: Tester) => has(t, "activated") },
    ].map((s) => ({ label: s.label, n: testers.filter(s.test).length }));
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
        { label: "主题深读", n: feat("theme_view") },
        { label: "对话", n: feat("chat_send") },
        { label: "分享卡", n: feat("share") },
      ],
    };
  }, [data, hideTest]);

  const cardBg = { background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, padding: 16 } as const;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--void, #07090f)", color: "var(--cream)", fontFamily: "var(--sans)", padding: "28px 20px 60px", maxWidth: 780, margin: "0 auto" }}>
      <div className="starfield" />
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--gold)", marginBottom: 4 }}>Molly · 内测看板</h1>
      <p style={{ fontSize: 12.5, color: "var(--mute)", marginBottom: 20 }}>实时漏斗 / AI 覆盖 / 反馈</p>

      {/* checking cookie */}
      {authed === null && <div style={{ fontSize: 13, color: "var(--mute)" }}>检查登录…</div>}

      {/* login gate */}
      {authed === false && (
        <div style={{ ...cardBg, maxWidth: 360 }}>
          <div style={{ fontSize: 13, color: "var(--cream-dim)", marginBottom: 10 }}>请输入管理密码</div>
          <div style={{ display: "flex", gap: 9 }}>
            <input type="password" value={pw} autoFocus onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="密码"
              style={{ flex: 1, background: "var(--void2, #0c111d)", border: "1px solid var(--field-bd)", borderRadius: 10, padding: "11px 14px", color: "var(--cream)", fontSize: 14, outline: "none" }} />
            <button onClick={doLogin} disabled={loading || !pw} style={{ border: "none", borderRadius: 10, padding: "0 20px", fontSize: 14, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", cursor: "pointer", opacity: loading || !pw ? 0.5 : 1 }}>{loading ? "…" : "登录"}</button>
          </div>
          {err && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 12 }}>登录后保持 30 天,不用再输。</div>
        </div>
      )}

      {authed && err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {authed && view && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, fontSize: 12.5, color: "var(--cream-dim)" }}>
            <span>测试者 <b style={{ color: "var(--gold)", fontSize: 18 }}>{view.testers.length}</b></span>
            <span>激活 <b style={{ color: "var(--green)", fontSize: 18 }}>{view.steps[4]?.n ?? 0}</b></span>
            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--mute)" }}>
              <input type="checkbox" checked={hideTest} onChange={(e) => setHideTest(e.target.checked)} /> 隐藏测试数据
            </label>
            <button onClick={loadData} style={{ background: "none", border: "1px solid var(--field-bd)", borderRadius: 8, color: "var(--cream-dim)", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>刷新</button>
            <button onClick={logout} style={{ background: "none", border: "1px solid var(--field-bd)", borderRadius: 8, color: "var(--mute)", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>退出</button>
          </div>

          {/* funnel */}
          <div style={{ ...cardBg, marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>激活漏斗</div>
            {view.steps.map((s, i) => {
              const pct = view.top ? Math.round((s.n / view.top) * 100) : 0;
              const stepPct = i > 0 && view.steps[i - 1].n ? Math.round((s.n / view.steps[i - 1].n) * 100) : null;
              return (
                <div key={s.label} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: "var(--cream-dim)" }}>{s.label}</span>
                    <span style={{ marginLeft: "auto", color: "var(--cream)" }}><b>{s.n}</b> <span style={{ color: "var(--mute)", fontSize: 11.5 }}>({pct}%{stepPct !== null ? ` · 上一步→${stepPct}%` : ""})</span></span>
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
              <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>真大师覆盖</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: "var(--green)" }}>{view.frTotal ? Math.round((view.aiReal / view.frTotal) * 100) : 0}%</div>
              <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>{view.aiReal}/{view.frTotal} 看到首读的人拿到了真解读(其余回退 stub)</div>
            </div>
            <div style={cardBg}>
              <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>功能使用(人数)</div>
              {view.features.map((f) => (
                <div key={f.label} style={{ display: "flex", fontSize: 13, marginBottom: 6, color: "var(--cream-dim)" }}>{f.label}<b style={{ marginLeft: "auto", color: "var(--cream)" }}>{f.n}</b></div>
              ))}
            </div>
          </div>

          {/* feedback */}
          <div style={{ ...cardBg, marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>反馈 ({view.feedback.length})</div>
            {view.feedback.length === 0 && <div style={{ fontSize: 13, color: "var(--mute)" }}>还没有反馈</div>}
            {view.feedback.map((f, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < view.feedback.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                <div style={{ fontSize: 14, color: "var(--cream)", lineHeight: 1.5 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 4 }}>{view.nameOf.get(f.testerId) ?? f.testerId.slice(0, 6)} · {f.page ?? "—"} · {fmt(f.ts)}</div>
              </div>
            ))}
          </div>

          {/* testers */}
          <div style={cardBg}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>测试者</div>
            {view.testers.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>
                <span style={{ color: "var(--cream)", minWidth: 80 }}>{t.profile?.name ?? "(未命名)"}</span>
                <span style={{ color: "var(--mute)", fontSize: 12 }}>{t.profile?.ascSign ? `上升${t.profile.ascSign}` : ""}</span>
                <span style={{ marginLeft: "auto", color: has(t, "activated") ? "var(--green)" : "var(--mute)", fontSize: 11.5 }}>{has(t, "activated") ? "已激活" : "未激活"} · {t.events.length} 事件</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
