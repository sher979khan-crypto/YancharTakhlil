export const locales = ["en", "ar", "uz"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Route locales stay short ("ar", "uz"); Intl needs explicit variants so Arabic keeps
// Latin digits and Uzbek is always Latin script.
export const intlLocale: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
  uz: "uz-Latn",
};

const rtlLocales: ReadonlySet<Locale> = new Set<Locale>(["ar"]);

export function isRtl(locale: Locale): boolean {
  return rtlLocales.has(locale);
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}
