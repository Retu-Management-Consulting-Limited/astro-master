import { describe, it, expect } from "vitest";
import { detectA2HS, type A2HSState } from "./a2hs";

// Real-world UA samples. The whole point of §6: branch on ENVIRONMENT, not OS.
const UA = {
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
  iosEdge: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 EdgiOS/120.0 Mobile/15E148 Safari/604.1",
  iosFirefox: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1",
  iosWeChat: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x18002831) NetType/WIFI Language/zh_CN",
  iosXHS: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 discover/8.0 XHS/8.0",
  androidChrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  androidWeChat: "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40",
  androidWebview: "Mozilla/5.0 (Linux; Android 12; M2101K6G; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  desktopChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  desktopSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
};

const want = (ua: string, hasBIP: boolean, standalone: boolean, state: A2HSState) =>
  expect(detectA2HS({ ua, hasBIP, standalone })).toBe(state);

describe("detectA2HS — environment-aware A2HS state (§6 matrix)", () => {
  it("standalone always wins → hidden", () => {
    want(UA.iosSafari, false, true, "standalone");
    want(UA.androidChrome, true, true, "standalone");
  });

  it("iOS in-app browsers (WeChat / XHS / Weibo / QQ) → ios-inapp (can't install, redirect)", () => {
    want(UA.iosWeChat, false, false, "ios-inapp");
    want(UA.iosXHS, false, false, "ios-inapp");
  });

  it("iOS Safari → ios-safari (share-sheet tutorial)", () => {
    want(UA.iosSafari, false, false, "ios-safari");
  });

  it("iOS Chrome / Edge / Firefox → ios-other (⋯ menu + Safari nudge), NOT ios-safari", () => {
    want(UA.iosChrome, false, false, "ios-other");
    want(UA.iosEdge, false, false, "ios-other");
    want(UA.iosFirefox, false, false, "ios-other");
  });

  it("Android WeChat / webview → android-webview (open in browser)", () => {
    want(UA.androidWeChat, false, false, "android-webview");
    want(UA.androidWebview, false, false, "android-webview");
  });

  it("Android Chrome with BIP → android-bip (one-tap)", () => {
    want(UA.androidChrome, true, false, "android-bip");
  });

  it("Android Chrome without BIP / other Android browsers → android-menu", () => {
    want(UA.androidChrome, false, false, "android-menu");
    want(UA.samsung, false, false, "android-menu");
  });

  it("desktop Chrome with BIP → desktop-bip; desktop without BIP → none", () => {
    want(UA.desktopChrome, true, false, "desktop-bip");
    want(UA.desktopChrome, false, false, "none");
    want(UA.desktopSafari, false, false, "none");
  });

  it("a BIP event does NOT override an iOS in-app webview (env beats BIP)", () => {
    want(UA.iosWeChat, true, false, "ios-inapp");
  });
});
