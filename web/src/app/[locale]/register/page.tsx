"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFunnel, snapshotOf } from "@/lib/store";
import { identify, track } from "@/lib/track";
import { apiRegister, apiLogin } from "@/lib/auth-client";
import { enablePush, pushAvailable } from "@/lib/push-client";

type Mode = "signup" | "login";

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();
  const setNickname = useFunnel((s) => s.setNickname);
  const loadServer = useFunnel((s) => s.loadServer);
  const chart = useFunnel((s) => s.chart);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifyStep, setNotifyStep] = useState(false); // post-signup permission ask
  const [enabling, setEnabling] = useState(false);

  // P1-3: a chart-less visitor is almost always a returning user on a fresh
  // device (deep-linked from a push/share). Honor ?mode=login so /input's
  // "已有账号？登录恢复" entry lands straight in the login state.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("mode") === "login") setMode("login");
    } catch {}
  }, []);

  // Guest / local-only path — keeps activation friction-free. (E2E entry point.)
  function continueLocal() {
    const nm = name.trim() || t("defaultNickname");
    setNickname(nm);
    identify({ name: nm, nickname: nm, ascSign: chart?.ascSign });
    track("activated");
    router.push("/today");
  }

  async function submitAccount() {
    if (busy) return;
    setErr(null);
    // P3-9: nickname is a display name, not an email — catch the common slip so
    // Molly never ends up addressing the user by their email address.
    if (mode === "signup" && name.includes("@")) { setErr(t("nicknameNoEmail")); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const nm = name.trim() || t("defaultNickname");
        setNickname(nm);
        // include the just-typed nickname in the snapshot we persist
        const snap = { ...snapshotOf(useFunnel.getState()), nickname: nm };
        const r = await apiRegister(email.trim(), pw, snap);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        identify({ name: nm, nickname: nm, ascSign: chart?.ascSign });
        track("activated", { account: true });
        // High-intent moment: ask for daily reminders right after sign-up. Show
        // a one-tap card (the tap is a fresh user gesture — required by iOS for
        // Notification.requestPermission). Skipped entirely where push isn't
        // available (unsupported device / no VAPID key) → straight to /today.
        if (pushAvailable()) setNotifyStep(true);
        else router.push("/today");
      } else {
        const r = await apiLogin(email.trim(), pw);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        // restore this account's chart onto a fresh device
        if (r.data.profile) loadServer(r.data.profile);
        const nm = r.data.profile?.nickname ?? t("defaultNickname");
        identify({ name: nm, nickname: nm, ascSign: r.data.profile?.chart ? (r.data.profile.chart as { ascSign?: string }).ascSign : undefined });
        track("logged_in");
        router.push(r.data.profile?.chart ? "/today" : "/input");
      }
    } catch {
      setErr(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function enableNotify() {
    if (enabling) return;
    setEnabling(true);
    try {
      await enablePush({ daily: true });
    } finally {
      router.push("/today");
    }
  }

  const lbtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 15, borderRadius: 13, fontSize: 15, fontWeight: 500, border: "1px solid #2b3445", background: "#11151f", color: "var(--cream)", cursor: "pointer" } as const;
  const gold = { ...lbtn, border: "none", background: "linear-gradient(100deg,var(--gold-deep),var(--gold) 50%,var(--gold-soft) 70%)", color: "#1a1305", fontWeight: 600 } as const;

  // P0-1: signing up to "留住你的盘" makes no sense without a chart. Show a
  // chart-first prompt instead of a sign-up form that would persist an empty chart.
  const noChartSignup = mode === "signup" && !chart;

  // Post-signup: one-tap daily-reminder opt-in (opt-out framing).
  if (notifyStep) {
    return (
      <main className="phone" data-testid="notify-step">
        <div className="starfield" />
        <div className="grain" />
        <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "30px 32px" }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>🌙</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 30, color: "var(--cream)", fontWeight: 500, lineHeight: 1.34 }}>
            {t("notify.title")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("notify.subtitle")}</span>
          </div>
          <p style={{ marginTop: 14, fontSize: 14.5, color: "var(--cream-dim)", lineHeight: 1.7 }}>
            {t("notify.body")}
          </p>
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
            <button data-testid="notify-enable" onClick={enableNotify} disabled={enabling} style={{ ...gold, opacity: enabling ? 0.7 : 1 }}>
              {enabling ? t("notify.enabling") : t("notify.enable")}
            </button>
            <button data-testid="notify-skip" onClick={() => router.push("/today")} style={{ ...lbtn, background: "transparent", border: "none", color: "var(--mute)" }}>
              {t("notify.skip")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="phone">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "24px 30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        </div>

        {/* P0-1: never claim a chart is "ready" when there is none. Badge only in
            signup; its text + tone follow whether the chart actually exists. */}
        {mode === "signup" && (
          <div className="reveal" data-testid="ready-badge" style={{ marginTop: 30, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: chart ? "rgba(127,201,154,.1)" : "rgba(201,168,97,.1)", border: `1px solid ${chart ? "rgba(127,201,154,.28)" : "rgba(201,168,97,.28)"}`, borderRadius: 30, padding: "7px 14px", fontSize: 12, color: chart ? "var(--green)" : "var(--gold-soft)" }}>{chart ? t("ready") : t("noChartBadge")}</div>
        )}

        <div className="reveal" style={{ marginTop: 18, fontFamily: "var(--serif)", fontSize: 32, color: "var(--cream)", fontWeight: 500, lineHeight: 1.34, animationDelay: ".2s" }}>
          {mode === "signup" ? (
            chart ? (
              <>{t("signupHeading1")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("signupHeading2")}</span></>
            ) : (
              <>{t("noChartHeading1")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("noChartHeading2")}</span></>
            )
          ) : (
            <>{t("loginHeading1")}<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>{t("loginHeading2")}</span></>
          )}
        </div>
        <p className="reveal" style={{ marginTop: 13, fontWeight: 300, fontSize: 14.5, color: "var(--cream-dim)", lineHeight: 1.7, animationDelay: ".35s" }}>
          {mode === "signup" ? (chart ? t("signupSub") : t("noChartSub")) : t("loginSub")}
        </p>

        {!noChartSignup && (
        <div className="reveal" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, animationDelay: ".5s" }}>
          {mode === "signup" && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>{t("nicknameLabel")}</div>
              <input className="field-inp" data-testid="nickname" type="text" placeholder={t("nicknamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>{t("emailLabel")}</div>
            <input className="field-inp" data-testid="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>{t("passwordLabel")}</div>
            <input className="field-inp" data-testid="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? t("passwordPlaceholderSignup") : t("passwordPlaceholderLogin")} value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} />
          </div>
          {err && <div data-testid="auth-err" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err}</div>}
        </div>
        )}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
          {noChartSignup ? (
            <button data-testid="go-input" onClick={() => router.push("/input")} style={gold}>{t("goInput")}</button>
          ) : (
            <>
              <button data-testid="account-submit" onClick={submitAccount} disabled={busy} style={{ ...gold, opacity: busy ? 0.7 : 1 }}>
                {busy ? t("submitBusy") : mode === "signup" ? t("submitSignup") : t("submitLogin")}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0", color: "var(--mute)", fontSize: 12 }}>
                <span style={{ flex: 1, height: 1, background: "#1f2735" }} />{t("otherMethods")}<span style={{ flex: 1, height: 1, background: "#1f2735" }} />
              </div>
              <button title={t("comingSoon")} disabled style={{ ...lbtn, opacity: 0.45, cursor: "not-allowed" }}>{t("googleContinue")}</button>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--cream-dim)" }}>
          {mode === "signup" ? (
            <>{t("hasAccount")}<button type="button" onClick={() => { setMode("login"); setErr(null); }} style={{ display: "inline", color: "var(--gold-soft)", cursor: "pointer", fontSize: "inherit" }}>{t("toLogin")}</button></>
          ) : (
            <>{t("noAccount")}<button type="button" onClick={() => { setMode("signup"); setErr(null); }} style={{ display: "inline", color: "var(--gold-soft)", cursor: "pointer", fontSize: "inherit" }}>{t("toSignup")}</button></>
          )}
        </div>

        <div style={{ marginTop: "auto", textAlign: "center" }}>
          <button type="button" data-testid="login" onClick={continueLocal} style={{ fontSize: 12.5, color: "var(--mute)", cursor: "pointer" }}>{t("continueLocal")}</button>
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--mute)" }}>{t("privacyNote")}</div>
        </div>
      </div>
    </main>
  );
}
