import { getSiteUrl } from "@/config/site";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

export type Alternates = {
  canonical: string;
  languages: Record<Locale | "x-default", string>;
};

/** "/" + locale + pathname, without a trailing slash ("/en", "/en/markets"). */
export function localizedPath(locale: Locale, pathname: string): string {
  const path = pathname.replace(/^\/+|\/+$/g, "");
  return path ? `/${locale}/${path}` : `/${locale}`;
}

/**
 * Absolute canonical + hreflang URLs for one locale-free pathname. x-default points at the
 * default locale because "/" only redirects there (no language detection).
 */
export function buildAlternates(
  locale: Locale,
  pathname: string,
  siteUrl: string = getSiteUrl(),
): Alternates {
  const url = (target: Locale) => `${siteUrl}${localizedPath(target, pathname)}`;
  const languages = Object.fromEntries(locales.map((target) => [target, url(target)])) as Record<
    Locale,
    string
  >;
  return {
    canonical: url(locale),
    languages: { ...languages, "x-default": url(defaultLocale) },
  };
}
