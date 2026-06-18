"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { detectA2HS, type A2HSState } from "@/lib/pwa/a2hs";
import { track } from "@/lib/track";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const ENGAGE = ["/today", "/chart", "/chat", "/me"];
const DISMISS_KEY = "molly_install_dismissed";

export function InstallPrompt() {
  const t = useTranslations("components.installPrompt");
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [state, setState] = useState<A2HSState>("none");
  const [copied, setCopied] = useState(false);

  // Register service worker (production only — avoids dev HMR / stale-chunk issues).
  // updateViaCache:"none" → the browser never serves sw.js from HTTP cache, so new
  // SW versions are detected. On a genuine update (not first install) reload once so
  // the installed PWA picks up the latest deploy.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        reg.update().catch(() => {});
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
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

  // Decide WHICH state (recomputes if a BIP arrives late). Gated on engage pages +
  // not-dismissed + not-already-installed; shown after a beat.
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const s = detectA2HS({ ua: navigator.userAgent, hasBIP: !!deferred, standalone });
    setState(s);
    if (s === "standalone" || s === "none") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!ENGAGE.includes(pathname)) return;
    const t = setTimeout(() => setShow(true), 2600);
    return () => clearTimeout(t);
  }, [pathname, deferred]);

  if (!show || state === "standalone" || state === "none") return null;

  const close = (remember: boolean) => {
    setShow(false);
    if (remember) localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    track("a2hs_install_tap", { state });
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    close(outcome === "accepted");
  };

  const copyLink = async () => {
    track("a2hs_copy_link", { state });
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false); // clipboard blocked (some webviews) → user long-presses the address bar
    }
  };

  const info = state === "ios-inapp" || state === "android-webview"; // ❌ can't install here → redirect
  const title = info ? t("titleInfo") : t("titleInstall");
  const desc = info
    ? state === "ios-inapp"
      ? t("descIosInapp")
      : t("descAndroidWebview")
    : t("descInstall");

  return (
    <div
      data-testid="install-prompt"
      data-state={state}
      style={{ position: "fixed", left: "50%", bottom: 86, transform: "translateX(-50%)", zIndex: 50, width: "min(360px, calc(100vw - 36px))", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(10,12,22,.98))", border: `1px solid ${info ? "rgba(143,182,216,.45)" : "rgba(201,168,97,.4)"}`, borderRadius: 18, padding: "15px 16px", boxShadow: `0 18px 50px -12px rgba(0,0,0,.7), 0 0 30px -16px ${info ? "rgba(143,182,216,.4)" : "rgba(201,168,97,.5)"}`, backdropFilter: "blur(8px)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: 13, background: info ? "radial-gradient(circle at 50% 45%, #bcd 0%, #8fb6d8 38%, #1a2547 74%, #0c1124 100%)" : "radial-gradient(circle at 50% 45%, #e0c98a 0%, #c9a861 38%, #1a2547 74%, #0c1124 100%)", boxShadow: `0 0 16px -4px ${info ? "rgba(143,182,216,.6)" : "rgba(201,168,97,.6)"}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "var(--cream)", fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>{desc}</div>
        </div>
        <button type="button" aria-label={t("close")} onClick={() => close(true)} style={{ fontSize: 18, color: "var(--mute)", cursor: "pointer", padding: 4 }}>✕</button>
      </div>

      <StateBody state={state} copied={copied} onInstall={install} onCopy={copyLink} t={t} />
    </div>
  );
}

const HINT = { marginTop: 11, fontSize: 12.5, color: "var(--cream-dim)", lineHeight: 1.7, background: "rgba(255,255,255,.04)", borderRadius: 11, padding: "10px 12px" } as const;
const G = "var(--gold-soft)";
const B = "var(--blue)";

type IPTranslator = ReturnType<typeof useTranslations<"components.installPrompt">>;

function StateBody({ state, copied, onInstall, onCopy, t }: { state: A2HSState; copied: boolean; onInstall: () => void; onCopy: () => void; t: IPTranslator }) {
  switch (state) {
    case "android-bip":
    case "desktop-bip":
      return (
        <button onClick={onInstall} style={{ marginTop: 12, width: "100%", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", cursor: "pointer" }}>
          {t("addToHomeBtn")}
        </button>
      );
    case "ios-safari":
      return (
        <div style={HINT}>
          {t("iosSafariBefore")}<b style={{ color: G }}>{t("iosSafariShare")}</b>{t("iosSafariMid")}<b style={{ color: G }}>{t("iosSafariAdd")}</b>{t("iosSafariAfter")}
        </div>
      );
    case "ios-other":
      return (
        <div style={HINT}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Num n={1} /> {t("iosOtherStep1Before")}<b style={{ color: G }}>{t("iosOtherStep1Menu")}</b>{t("iosOtherStep1After")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}><Num n={2} /> {t("iosOtherStep2Before")}<b style={{ color: G }}>{t("iosOtherStep2Add")}</b></div>
          <div style={{ marginTop: 9, fontSize: 11.5, color: G }}>{t("iosOtherTip")}</div>
        </div>
      );
    case "android-menu":
      return (
        <div style={HINT}>
          {t("androidMenuBefore")}<b style={{ color: G }}>{t("androidMenuMenu")}</b>{t("androidMenuMid")}<b style={{ color: G }}>{t("androidMenuAdd")}</b>{t("androidMenuAfter")}
        </div>
      );
    case "ios-inapp":
    case "android-webview":
      return (
        <>
          <div style={HINT}>
            {t("webviewBefore")}<b style={{ color: B }}>{t("webviewDots")}</b>{t("webviewMid")}<b style={{ color: B }}>{state === "ios-inapp" ? t("webviewOpenIosSafari") : t("webviewOpenBrowser")}</b>{t("webviewAfter")}
          </div>
          <button onClick={onCopy} style={{ marginTop: 11, width: "100%", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, color: "#0a1018", background: "linear-gradient(180deg,#a9cde8,#8fb6d8)", cursor: "pointer" }}>
            {copied ? t("copyLinkDone") : t("copyLinkBtn")}
          </button>
        </>
      );
    default:
      return null;
  }
}

function Num({ n }: { n: number }) {
  return <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--gold)", color: "#1a1408", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{n}</span>;
}
