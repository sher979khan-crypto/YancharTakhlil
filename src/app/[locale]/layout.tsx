import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("title"),
    description: t("description"),
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
      <body className="font-sans text-fg antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
