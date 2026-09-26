import { intlLocale, type Locale } from "./config";

const CURRENCY = "USD";

export function formatPrice(value: number, locale: Locale): string {
  const abs = Math.abs(value);
  const digits: Intl.NumberFormatOptions =
    abs >= 1 || abs === 0
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : abs >= 0.01
        ? { minimumFractionDigits: 4, maximumFractionDigits: 4 }
        : // Micro-cap prices: significant digits keep precision without padding zeros.
          { maximumSignificantDigits: 8 };

  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: CURRENCY,
    ...digits,
  }).format(value);
}

/** `value` is already a percentage: 2.5 means 2.5%. */
export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "percent",
    // A flat 0% has no direction, so it gets no sign.
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatCompactCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(value);
}
