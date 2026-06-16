"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const ENGAGE = ["/today", "/chart", "/chat", "/me"];
const DISMISS_KEY = "molly_install_dismissed";

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [manual, setManual] = useState(false); // non-iOS, no native prompt → generic hint

  // Register service worker (production only — avoids dev HMR / stale-chunk issues).
  // updateViaCache:"none" → the browser never serves sw.js itself from HTTP cache,
  // so new SW versions are detected. When a new SW activates (an update, not the
  // first install), reload once so the installed PWA picks up the latest deploy
  // instead of showing stale content.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Was this page ALREADY controlled by a SW at load time? Snapshot it now,
    // BEFORE registering — because sw.js calls clients.claim() on activate, which
    // sets navigator.serviceWorker.controller during the FIRST install too. So
    // checking controller after activation can't tell first-install from update,
    // and first-time visitors would get a jarring reload (and every mount-based
    // metric double-fires). Only a genuine update has a controller up front.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        reg.update().catch(() => {});
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
            // hadController (pre-register) = there was a previous SW → real update
            if (nw.state === "activated" && hadController && !reloaded) {
              reloaded = true;
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!ENGAGE.includes(pathname)) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    // iOS has no beforeinstallprompt — show manual hint anyway.
    const t = setTimeout(() => setShow(true), 2600);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  const close = (remember: boolean) => {
    setShow(false);
    if (remember) localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      close(outcome === "accepted");
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIos(true); // iOS Safari → share-sheet instructions
    } else {
      setManual(true); // other browser with no native prompt → generic menu hint
    }
  };

  return (
    <div data-testid="install-prompt" style={{ position: "fixed", left: "50%", bottom: 86, transform: "translateX(-50%)", zIndex: 50, width: "min(360px, calc(100vw - 36px))", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(10,12,22,.98))", border: "1px solid rgba(201,168,97,.4)", borderRadius: 18, padding: "15px 16px", boxShadow: "0 18px 50px -12px rgba(0,0,0,.7), 0 0 30px -16px rgba(201,168,97,.5)", backdropFilter: "blur(8px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: 13, background: "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 38%, #1a2547 74%, #0c1124 100%)", boxShadow: "0 0 16px -4px rgba(201,168,97,.6)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "var(--cream)", fontWeight: 600 }}>把 Molly 放进你的口袋</div>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>加到桌面 · 每早一句话，不用每次找我</div>
        </div>
        <button type="button" aria-label="关闭" onClick={() => close(true)} style={{ fontSize: 18, color: "var(--mute)", cursor: "pointer", padding: 4 }}>✕</button>
      </div>

      {ios ? (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--cream-dim)", lineHeight: 1.7, background: "rgba(255,255,255,.04)", borderRadius: 11, padding: "10px 12px" }}>
          点底部 <b style={{ color: "var(--gold-soft)" }}>分享 ⎙</b> → 选 <b style={{ color: "var(--gold-soft)" }}>添加到主屏幕</b>，Molly 就住进你的手机了。
        </div>
      ) : manual ? (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--cream-dim)", lineHeight: 1.7, background: "rgba(255,255,255,.04)", borderRadius: 11, padding: "10px 12px" }}>
          打开浏览器<b style={{ color: "var(--gold-soft)" }}>菜单（⋮）</b> → 选 <b style={{ color: "var(--gold-soft)" }}>安装应用 / 添加到主屏幕</b>，Molly 就住进你的手机了。
        </div>
      ) : (
        <button onClick={install} style={{ marginTop: 12, width: "100%", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", cursor: "pointer" }}>
          一键添加到桌面
        </button>
      )}
    </div>
  );
}
