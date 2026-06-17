import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";
import { StoreHydration } from "@/components/StoreHydration";
import { AuthHydration } from "@/components/AuthHydration";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PageView } from "@/components/PageView";

export async function generateMetadata({
  params,
}: {
  // Next 16: params is async. Inline type (matches the layout's own pattern)
  // so `tsc --noEmit` passes on a clean checkout before .next/types exists.
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Molly" },
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#04050a",
  width: "device-width",
  initialScale: 1,
  // no maximumScale — allow pinch-zoom for accessibility (WCAG 1.4.4)
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  // Next 16: params is async. Inline type instead of the build-generated
  // `LayoutProps<'/[locale]'>` global so `tsc --noEmit` passes on a clean
  // checkout (before any `next build` materialises .next/types).
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500;1,600&family=Hanken+Grotesk:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500&display=swap&subset=cyrillic,cyrillic-ext,latin"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <StoreHydration />
          <AuthHydration />
          <PageView />
          {children}
          <InstallPrompt />
          <FeedbackButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
