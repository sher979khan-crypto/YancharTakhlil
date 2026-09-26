import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AssistantSlot } from "@/components/features/assistant/assistant-slot";
import { SiteFooter } from "@/components/features/site-footer/site-footer";
import { SiteHeader } from "@/components/features/site-header/site-header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/features/skip-link/skip-link";
import { getSiteUrl, siteConfig } from "@/config/site";
import { fontVariables } from "@/lib/fonts";
import { getDir } from "@/lib/i18n/config";
import { routing } from "@/lib/i18n/routing";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Dark-only MVP: the browser chrome and native controls match the page.
export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  colorScheme: "dark",
};

// Canonical/hreflang are set per page (src/lib/seo/page-metadata.ts), never here: a layout-level
// canonical would leak into the 404 page and any page that forgets its own.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: t("title"),
      template: `%s | ${siteConfig.name}`,
    },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: t("title"),
      description: t("description"),
    },
  };
}

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

// Root layout (no app/layout.tsx): the [locale] segment must own <html> to set lang/dir.
// Explicit props instead of the global LayoutProps helper: that type only exists after
// `next build`/`next typegen`, so `tsc --noEmit` would fail on a clean clone.
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} dir={getDir(locale)} className={fontVariables}>
      <body className="flex flex-col font-sans text-fg antialiased">
        <NextIntlClientProvider>
          <SkipLink />
          <SiteHeader />
          {/* tabIndex -1 lets the skip link move focus here; main is not interactive, so no ring. */}
          <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
          <AssistantSlot />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
