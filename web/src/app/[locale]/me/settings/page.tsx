"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { apiMe, apiLogout, apiDeleteAccount, type Me } from "@/lib/auth-client";
import { pushAvailable, isPushEnabled, enablePush, disablePush } from "@/lib/push-client";
import { BackButton } from "@/components/BackButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const NOTIF_KEY = "molly_notif";
type Notif = { daily: boolean; wealth: boolean; synastry: boolean };
const DEFAULT_NOTIF: Notif = { daily: true, wealth: true, synastry: true };

function Toggle({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  const lit = on && !disabled;
  return (
    <button type="button" role="switch" aria-checked={on} aria-disabled={disabled} disabled={disabled} aria-label={label} onClick={disabled ? undefined : onClick} style={{ marginLeft: "auto", width: 42, height: 24, borderRadius: 13, background: lit ? "var(--gold-deep)" : "#2a3344", position: "relative", flex: "0 0 auto", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, transition: "background .2s" }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 2, left: lit ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: lit ? "#1a1305" : "#cdd3dc", transition: ".2s" }} />
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("me");
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const setNickname = useFunnel((s) => s.setNickname);
  const [notif, setNotif] = useState<Notif>(DEFAULT_NOTIF);
  const [toast, setToast] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(raw) });
    } catch {}
    apiMe().then(setMe);
    // Reflect the REAL push subscription state for the daily toggle.
    isPushEnabled().then((en) => setNotif((n) => ({ ...n, daily: en })));
  }, []);

  if (!ready || !chart) return null;

  // wealth/synastry are preference flags (ride the daily subscription for now).
  const flip = (k: keyof Notif) => {
    const next = { ...notif, [k]: !notif[k] };
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  // The daily toggle drives the real Web Push subscription.
  const toggleDaily = async () => {
    if (!pushAvailable()) {
      flash(t("toastPushUnsupported"));
      return;
    }
    if (notif.daily) {
      await disablePush();
      setNotif((n) => ({ ...n, daily: false }));
      flash(t("toastDailyOff"));
    } else {
      const ok = await enablePush({ daily: true });
      setNotif((n) => ({ ...n, daily: ok }));
      flash(ok ? t("toastDailyOn") : t("toastDailyFail"));
    }
  };

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const editNick = () => {
    const v = window.prompt(t("promptNickname"), nickname ?? "");
    if (v && v.trim()) {
      setNickname(v.trim());
      flash(t("toastNickSaved"));
    }
  };

  // Real data export — the user's own data, downloadable as JSON.
  const exportData = () => {
    const s = useFunnel.getState();
    const payload = { exportedAt: new Date().toISOString(), birth: s.birth, birthForm: s.birthForm, chart: s.chart, firstRead: s.firstRead, nickname: s.nickname };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "molly-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    flash(t("toastExported"));
  };

  const logout = async () => {
    await apiLogout();
    setMe(null);
    // L3: also clear the locally-persisted chart so the next person on a shared
    // device can't reach gated pages with the previous user's reading.
    useFunnel.getState().reset();
    try {
      localStorage.removeItem("molly-funnel");
      localStorage.removeItem(NOTIF_KEY);
    } catch {}
    window.location.assign("/");
  };

  // Real deletion — wipes the chart and ALL persisted data, server + local.
  const deleteAll = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    await apiDeleteAccount(); // remove the account + server-side data too
    useFunnel.getState().reset();
    try {
      localStorage.removeItem("molly-funnel");
      localStorage.removeItem(NOTIF_KEY);
      localStorage.removeItem("molly_install_dismissed");
    } catch {}
    // Hard navigation to landing: full reset, and avoids the chart-guard
    // racing us to /input the instant the store is cleared.
    window.location.assign("/");
  };

  const row = (label: React.ReactNode, right: React.ReactNode, onClick?: () => void, danger?: boolean, last?: boolean): React.ReactNode => {
    const style = { display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" as const, padding: "14px 15px", fontSize: 14.5, color: danger ? "var(--red)" : "var(--cream)", borderBottom: last ? "none" : "1px solid rgba(255,255,255,.05)", cursor: onClick ? "pointer" : "default" };
    return onClick ? (
      <button type="button" onClick={onClick} style={style}>{label}{right}</button>
    ) : (
      <div style={style}>{label}{right}</div>
    );
  };

  return (
    <main className="phone" data-testid="settings">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("settingsSrTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>{t("settingsHeader")}</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "16px 22px 24px" }}>
        <Group label={t("groupAccount")}>
          {row(t("rowNickname"), <span style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>{nickname ?? t("nicknameUnset")} ›</span>, editNick)}
          {me
            ? row(t("rowLoginMethod"), <span data-testid="account-email" style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, minWidth: 0 }}>{me.email} ›</span>, undefined, false, false)
            : row(t("rowLoginMethod"), <span style={{ marginLeft: "auto", color: "var(--gold-soft)", fontSize: 13 }}>{t("loginLocalUnbound")}</span>, () => router.push("/register"), false, true)}
          {me && row(t("rowLogout"), <span data-testid="logout" style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>›</span>, logout, false, true)}
        </Group>

        <Group label={t("groupLanguage")}>
          <LocaleSwitcher />
        </Group>

        <Group label={t("groupNotif")}>
          {row(t("notifDaily"), <Toggle on={notif.daily} onClick={toggleDaily} label={t("notifDaily")} />)}
          {row(<>{t("notifWealth")} <span style={{ fontSize: 11, color: "var(--mute)" }}>{t("comingSoon")}</span></>, <Toggle on={false} onClick={() => {}} label={t("notifWealthAria")} disabled />)}
          {row(<>{t("notifSynastry")} <span style={{ fontSize: 11, color: "var(--mute)" }}>{t("comingSoon")}</span></>, <Toggle on={false} onClick={() => {}} label={t("notifSynastryAria")} disabled />, undefined, false, true)}
          <div style={{ padding: "8px 15px 12px", fontSize: 11, color: "var(--mute)", lineHeight: 1.6 }}>{t("notifHintBefore")}<b style={{ color: "var(--cream-dim)" }}>{t("notifHintDailyBold")}</b>{t("notifHintMid")}<b style={{ color: "var(--cream-dim)" }}>{t("notifHintComingBold")}</b>{t("notifHintAfter")}</div>
        </Group>

        <Group label={t("groupPrivacy")}>
          {row(t("rowKnowMe"), <span style={{ marginLeft: "auto", color: "#4f5666" }}>›</span>, () => router.push("/chat"))}
          {row(t("rowExport"), <span data-testid="export-data" style={{ marginLeft: "auto", color: "#4f5666" }}>›</span>, exportData)}
          {row(t("rowDelete"), <span data-testid="delete-data" style={{ marginLeft: "auto", color: "var(--red)" }}>›</span>, deleteAll, true, true)}
        </Group>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", margin: "0 2px 9px" }}>{t("groupAbout")}</div>
          <div style={{ background: "rgba(143,182,216,.06)", border: "1px solid rgba(143,182,216,.2)", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, color: "#9fb6cf", lineHeight: 1.7 }}>
            {t("aboutBefore")}<strong style={{ color: "#cfe0f0" }}>{t("aboutAiBold")}</strong>{t("aboutMid")}<strong style={{ color: "#cfe0f0" }}>{t("aboutDisclaimerBold")}</strong>{t("aboutAfter")}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#566073", marginTop: 14 }}>{t("version")}</div>
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "absolute", left: "50%", bottom: 40, transform: "translateX(-50%)", zIndex: 9, background: "rgba(10,12,20,.92)", border: "1px solid var(--field-bd)", color: "var(--cream)", fontSize: 13, padding: "9px 18px", borderRadius: 12, whiteSpace: "nowrap" }}>{toast}</div>
      )}
    </main>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", margin: "0 2px 9px" }}>{label}</div>
      <div style={{ background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 14, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
