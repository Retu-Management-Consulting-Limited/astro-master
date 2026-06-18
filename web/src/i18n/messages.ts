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
import zhInput from "../../messages/zh/input.json";
import zhForms from "../../messages/zh/forms.json";
import zhChart from "../../messages/zh/chart.json";
import zhMe from "../../messages/zh/me.json";
import zhToday from "../../messages/zh/today.json";
import zhChat from "../../messages/zh/chat.json";

import ruCommon from "../../messages/ru/common.json";
import ruNav from "../../messages/ru/nav.json";
import ruLanding from "../../messages/ru/landing.json";
import ruMeta from "../../messages/ru/meta.json";
import ruNotFound from "../../messages/ru/notFound.json";
import ruError from "../../messages/ru/error.json";
import ruInput from "../../messages/ru/input.json";
import ruForms from "../../messages/ru/forms.json";
import ruChart from "../../messages/ru/chart.json";
import ruMe from "../../messages/ru/me.json";
import ruToday from "../../messages/ru/today.json";
import ruChat from "../../messages/ru/chat.json";

export const NAMESPACES = [
  "common",
  "nav",
  "landing",
  "meta",
  "notFound",
  "error",
  "input",
  "forms",
  "chart",
  "me",
  "today",
  "chat",
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
    input: zhInput,
    forms: zhForms,
    chart: zhChart,
    me: zhMe,
    today: zhToday,
    chat: zhChat,
  },
  ru: {
    common: ruCommon,
    nav: ruNav,
    landing: ruLanding,
    meta: ruMeta,
    notFound: ruNotFound,
    error: ruError,
    input: ruInput,
    forms: ruForms,
    chart: ruChart,
    me: ruMe,
    today: ruToday,
    chat: ruChat,
  },
};

/** Merge every namespace JSON for `locale` into one object keyed by namespace. */
export function loadMessages(locale: AppLocale): Bundle {
  return BUNDLE[locale];
}
