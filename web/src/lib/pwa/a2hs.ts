// A2HS (add-to-home-screen) environment detection — design §6.
//
// KEY PRINCIPLE: whether a user CAN install is decided by the browser ENVIRONMENT,
// not the OS. Branching purely on iOS/Android sends iOS-Chrome and in-app webviews
// (WeChat etc) down paths that don't work. We branch on UA + beforeinstallprompt.
//
// Pure function (UA + hasBIP + standalone in, state out) so it's unit-testable
// against real UA strings — never trust a live device to exercise every branch.

export type A2HSState =
  | "standalone" // already installed → show nothing
  | "android-bip" // Android Chrome, beforeinstallprompt fired → native one-tap
  | "android-menu" // Android Chrome (no BIP) / Samsung / UC / Xiaomi … → ⋮ menu
  | "android-webview" // Android WeChat / in-app webview → open in a real browser
  | "ios-safari" // iOS Safari → bottom share-sheet tutorial
  | "ios-other" // iOS Chrome / Edge / Firefox → ⋯ menu + soft nudge to Safari
  | "ios-inapp" // iOS WeChat / XHS / Weibo / QQ → open in Safari
  | "desktop-bip" // desktop Chrome / Edge with BIP → address-bar install icon
  | "none"; // no reliable install path (e.g. desktop Safari/Firefox) → hide

export interface A2HSInput {
  ua: string;
  hasBIP: boolean; // a beforeinstallprompt event is held
  standalone: boolean;
}

// In-app browser markers (both iOS and Android). XHS=小红书, WeiBo=微博.
const IN_APP = /MicroMessenger|WeiBo|XHS|QQ/i;

export function detectA2HS({ ua, hasBIP, standalone }: A2HSInput): A2HSState {
  if (standalone) return "standalone";

  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const inApp = IN_APP.test(ua);

  // Environment beats BIP: an in-app webview can't A2HS even if a BIP somehow fires.
  if (isIOS && inApp) return "ios-inapp";
  if (isAndroid && (inApp || /;\s*wv\)/i.test(ua))) return "android-webview";

  if (isIOS) return /CriOS|EdgiOS|FxiOS/i.test(ua) ? "ios-other" : "ios-safari";
  if (isAndroid) return hasBIP ? "android-bip" : "android-menu";

  return hasBIP ? "desktop-bip" : "none";
}
