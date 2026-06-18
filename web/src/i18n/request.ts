import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Messages are split per-namespace under messages/<locale>/*.json and
    // merged here so concurrent i18n tasks never collide on one mega-JSON.
    messages: loadMessages(locale),
  };
});
