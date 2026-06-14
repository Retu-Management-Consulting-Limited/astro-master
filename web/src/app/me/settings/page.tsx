"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { apiMe, apiLogout, apiDeleteAccount, type Me } from "@/lib/auth-client";
import { pushAvailable, isPushEnabled, enablePush, disablePush } from "@/lib/push-client";
import { BackButton } from "@/components/BackButton";

const NOTIF_KEY = "molly_notif";
type Notif = { daily: boolean; wealth: boolean; synastry: boolean };
const DEFAULT_NOTIF: Notif = { daily: true, wealth: true, synastry: true };

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ marginLeft: "auto", width: 42, height: 24, borderRadius: 13, background: on ? "var(--gold-deep)" : "#2a3344", position: "relative", flex: "0 0 auto", cursor: "pointer", transition: "background .2s" }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: on ? "#1a1305" : "#cdd3dc", transition: ".2s" }} />
    </button>
  );
}

export default function SettingsPage() {
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
      flash("这台设备暂不支持推送（iOS 需先「添加到主屏幕」）");
      return;
    }
    if (notif.daily) {
      await disablePush();
      setNotif((n) => ({ ...n, daily: false }));
      flash("已关闭每日提醒");
    } else {
      const ok = await enablePush({ daily: true });
      setNotif((n) => ({ ...n, daily: ok }));
      flash(ok ? "每日提醒已开启 ✓" : "没能开启——请在系统里允许通知");
    }
  };

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const editNick = () => {
    const v = window.prompt("改个名字，Molly 怎么称呼你？", nickname ?? "");
    if (v && v.trim()) {
      setNickname(v.trim());
      flash("改好了 ✓");
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
    flash("已导出 molly-my-data.json");
  };

  const logout = async () => {
    await apiLogout();
    setMe(null);
    flash("已退出登录");
  };

  // Real deletion — wipes the chart and ALL persisted data, server + local.
  const deleteAll = async () => {
    if (!window.confirm("这会删掉你的本命盘和 Molly 对你的全部记忆，且无法恢复。确定吗？")) return;
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
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <BackButton />
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>设置</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "16px 22px 24px" }}>
        <Group label="账户">
          {row("昵称", <span style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>{nickname ?? "未设置"} ›</span>, editNick)}
          {me
            ? row("登录方式", <span data-testid="account-email" style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>{me.email} ›</span>, undefined, false, false)
            : row("登录方式", <span style={{ marginLeft: "auto", color: "var(--gold-soft)", fontSize: 13 }}>本机 · 未绑定，去登录 ›</span>, () => router.push("/register"), false, true)}
          {me && row("退出登录", <span data-testid="logout" style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>›</span>, logout, false, true)}
        </Group>

        <Group label="通知">
          {row("每日星象提醒", <Toggle on={notif.daily} onClick={toggleDaily} label="每日星象提醒" />)}
          {row("财运黄金日提醒", <Toggle on={notif.wealth} onClick={() => flip("wealth")} label="财运黄金日提醒" />)}
          {row("合盘 · 对方测好了", <Toggle on={notif.synastry} onClick={() => flip("synastry")} label="合盘 · 对方测好了提醒" />, undefined, false, true)}
        </Group>

        <Group label="隐私与数据">
          {row("查看 Molly 对我的了解", <span style={{ marginLeft: "auto", color: "#4f5666" }}>›</span>, () => router.push("/chat"))}
          {row("导出我的数据", <span data-testid="export-data" style={{ marginLeft: "auto", color: "#4f5666" }}>›</span>, exportData)}
          {row("删除我的盘与全部数据", <span data-testid="delete-data" style={{ marginLeft: "auto", color: "var(--red)" }}>›</span>, deleteAll, true, true)}
        </Group>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", margin: "0 2px 9px" }}>关于</div>
          <div style={{ background: "rgba(143,182,216,.06)", border: "1px solid rgba(143,182,216,.2)", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, color: "#9fb6cf", lineHeight: 1.7 }}>
            ✦ Molly 是一位<strong style={{ color: "#cfe0f0" }}>由 AI 驱动</strong>的占星向导。她的解读基于占星模型与算法生成，用于自我探索与陪伴，<strong style={{ color: "#cfe0f0" }}>不构成医疗、法律或投资建议</strong>。你的出生数据只用来为你排盘，你可以随时导出或彻底删除。
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#566073", marginTop: 14 }}>Molly · v0.1 · 看穿你的本命</div>
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
