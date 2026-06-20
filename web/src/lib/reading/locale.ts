import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";

// Single source for "what locale is the user looking at" inside the content/voice
// layer (lib/reading, lib/astro, lib/ai, …). The deterministic content tables take
// a `locale` param, but the caller pages are UI .tsx (out of scope for the i18n
// content work) and don't thread useLocale() through. So content functions default
// their locale param to currentLocale(), read from the URL prefix
// (localePrefix: "as-needed" → "/ru/…" = ru, no prefix = zh). This keeps the change
// entirely inside the voice layer and leaves the zh path byte-identical (off /ru,
// this returns the default "zh", so existing callers behave exactly as before).
//
// SSR / non-browser (tests calling computeChart in Node, server render): no window
// → fall back to defaultLocale. Mirrors remote.ts's currentLocale(), centralized
// here so astro/reading both import one copy instead of duplicating the rule.
export function currentLocale(): AppLocale {
  if (typeof window === "undefined") return routing.defaultLocale;
  const seg = window.location.pathname.split("/")[1];
  return hasLocale(routing.locales, seg) ? seg : routing.defaultLocale;
}
