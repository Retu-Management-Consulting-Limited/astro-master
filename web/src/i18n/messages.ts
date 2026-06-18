import type { AppLocale } from "./routing";

// ---- Per-namespace message manifest ----
//
// Messages are split one file per namespace (messages/<locale>/<ns>.json) so
// parallel i18n tasks each own a distinct file and never collide on a single
// mega-JSON. This module statically imports every namespace for both locales
// and merges them at module load. Static imports (not dynamic glob) keep it
// portable across the Next bundler, Turbopack AND vitest — `import.meta.glob`
// is Vite-only and would break `next build`.
//
// Adding a namespace (Tasks 2–9):
//   1. create messages/zh/<ns>.json AND messages/ru/<ns>.json
//   2. add the two imports below + an entry in BUNDLE.
// The key-parity guard fails loudly if zh/ru drift or a side is missing.

import zhCommon from "../../messages/zh/common.json";
import zhNav from "../../messages/zh/nav.json";
import zhLanding from "../../messages/zh/landing.json";
import zhMeta from "../../messages/zh/meta.json";
import zhNotFound from "../../messages/zh/notFound.json";
import zhError from "../../messages/zh/error.json";

import ruCommon from "../../messages/ru/common.json";
import ruNav from "../../messages/ru/nav.json";
import ruLanding from "../../messages/ru/landing.json";
import ruMeta from "../../messages/ru/meta.json";
import ruNotFound from "../../messages/ru/notFound.json";
import ruError from "../../messages/ru/error.json";

export const NAMESPACES = [
  "common",
  "nav",
  "landing",
  "meta",
  "notFound",
  "error",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

type Bundle = Record<Namespace, Record<string, unknown>>;

const BUNDLE: Record<AppLocale, Bundle> = {
  zh: {
    common: zhCommon,
    nav: zhNav,
    landing: zhLanding,
    meta: zhMeta,
    notFound: zhNotFound,
    error: zhError,
  },
  ru: {
    common: ruCommon,
    nav: ruNav,
    landing: ruLanding,
    meta: ruMeta,
    notFound: ruNotFound,
    error: ruError,
  },
};

/** Merge every namespace JSON for `locale` into one object keyed by namespace. */
export function loadMessages(locale: AppLocale): Bundle {
  return BUNDLE[locale];
}
