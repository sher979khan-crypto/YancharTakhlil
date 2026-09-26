import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { locales, type Locale } from "@/lib/i18n/config";

import { buildAlternates } from "./alternates";

const ogLocales: Record<Locale, string> = {
  en: "en_US",
  ar: "ar_AR",
  uz: "uz_UZ",
};

type PageMetadataInput = {
  locale: Locale;
  /** Locale-free pathname, e.g. "/" or "/markets". */
  pathname: string;
  /** Page title; the root layout's template appends the brand. */
  title: string;
  description: string;
};

/** Metadata every public page needs: title, description, canonical, hreflang and Open Graph. */
export function buildPageMetadata({
  locale,
  pathname,
  title,
  description,
}: PageMetadataInput): Metadata {
  const alternates = buildAlternates(locale, pathname);
  return {
    title,
    description,
    alternates,
    // Metadata merges shallowly, so the page must repeat every openGraph field it wants.
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description,
      url: alternates.canonical,
      locale: ogLocales[locale],
      alternateLocale: locales.filter((other) => other !== locale).map((other) => ogLocales[other]),
    },
  };
}
