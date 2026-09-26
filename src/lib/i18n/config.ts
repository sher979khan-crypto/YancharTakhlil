export const locales = ["en", "ar", "uz"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

const rtlLocales: ReadonlySet<Locale> = new Set<Locale>(["ar"]);

export function isRtl(locale: Locale): boolean {
  return rtlLocales.has(locale);
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}
