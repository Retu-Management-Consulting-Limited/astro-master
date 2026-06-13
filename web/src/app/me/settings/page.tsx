"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";

const NOTIF_KEY = "molly_notif";
type Notif = { daily: boolean; wealth: boolean; synastry: boolean };
const DEFAULT_NOTIF: Notif = { daily: true, wealth: true, synastry: true };

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ marginLeft: "auto", width: 42, height: 24, borderRadius: 13, background: on ? "var(--gold-deep)" : "#2a3344", position: "relative", flex: "0 0 auto", cursor: "pointer", transition: ".2s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: on ? "#1a1305" : "#cdd3dc", transition: ".2s" }} />
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const setNickname = useFunnel((s) => s.setNickname);
  const [notif, setNotif] = useState<Notif>(DEFAULT_NOTIF);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(raw) });
    } catch {}
  }, []);

  if (!ready || !chart) return null;

  const flip = (k: keyof Notif) => {
    const next = { ...notif, [k]: !notif[k] };
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); // TODO(push): real push subscription
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

  // Real deletion — wipes the chart and ALL persisted data, then resets.
  const deleteAll = () => {
    if (!window.confirm("这会删掉你的本命盘和 Molly 对你的全部记忆，且无法恢复。确定吗？")) return;
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

  const row = (label: React.ReactNode, right: React.ReactNode, onClick?: () => void, danger?: boolean, last?: boolean): React.ReactNode => (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 15px", fontSize: 14.5, color: danger ? "var(--red)" : "var(--cream)", borderBottom: last ? "none" : "1px solid rgba(255,255,255,.05)", cursor: onClick ? "pointer" : "default" }}>
      {label}
      {right}
    </div>
  );

  return (
    <main className="phone" data-testid="settings">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 6px" }}>
        <span onClick={() => router.back()} style={{ fontSize: 20, color: "var(--mute)", cursor: "pointer" }}>←</span>
        <span style={{ fontWeight: 500, letterSpacing: ".32em", fontSize: 13, color: "var(--cream)" }}>设置</span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "16px 22px 24px" }}>
        <Group label="账户">
          {row("昵称", <span style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>{nickname ?? "未设置"} ›</span>, editNick)}
          {row("登录方式", <span style={{ marginLeft: "auto", color: "var(--mute)", fontSize: 13 }}>本机 · 未绑定 ›</span>, undefined, false, true)}
        </Group>

        <Group label="通知">
          {row("每日星象提醒", <Toggle on={notif.daily} onClick={() => flip("daily")} />)}
          {row("财运黄金日提醒", <Toggle on={notif.wealth} onClick={() => flip("wealth")} />)}
          {row("合盘 · 对方测好了", <Toggle on={notif.synastry} onClick={() => flip("synastry")} />, undefined, false, true)}
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
        <div style={{ position: "absolute", left: "50%", bottom: 40, transform: "translateX(-50%)", zIndex: 9, background: "rgba(10,12,20,.92)", border: "1px solid var(--field-bd)", color: "var(--cream)", fontSize: 13, padding: "9px 18px", borderRadius: 12, whiteSpace: "nowrap" }}>{toast}</div>
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
