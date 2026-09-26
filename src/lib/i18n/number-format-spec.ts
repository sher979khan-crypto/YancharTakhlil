import type { Locale } from "./config";

export type CompactUnit = "thousand" | "million" | "billion" | "trillion";

export type NumberFormatSpec = Readonly<{
  group: string;
  decimal: string;
  compact: Readonly<Record<CompactUnit, string>>;
  /** Put a space between the number and the compact suffix ("1.23 تريليون" vs "1.23T"). */
  compactSpace: boolean;
}>;

// Our own separators and suffixes: runtimes ship different Intl locale data (Chromium has no
// Uzbek number data), so relying on Intl for ar/uz breaks server/client hydration.
export const numberFormatSpec: Readonly<Record<Locale, NumberFormatSpec>> = {
  en: {
    group: ",",
    decimal: ".",
    compact: { thousand: "K", million: "M", billion: "B", trillion: "T" },
    compactSpace: false,
  },
  ar: {
    group: ",",
    decimal: ".",
    compact: { thousand: "ألف", million: "مليون", billion: "مليار", trillion: "تريليون" },
    compactSpace: true,
  },
  uz: {
    // Uzbek national standard: no-break space groups, comma decimal.
    group: " ",
    decimal: ",",
    compact: { thousand: "ming", million: "mln", billion: "mlrd", trillion: "trln" },
    compactSpace: true,
  },
};
