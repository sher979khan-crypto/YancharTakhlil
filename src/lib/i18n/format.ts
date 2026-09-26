import type { Locale } from "./config";
import { numberFormatSpec, type CompactUnit, type NumberFormatSpec } from "./number-format-spec";

// Intl is only ever called with en-US: every browser and Node build ships its data, so server
// and client produce identical parts. Locale differences come from number-format-spec.ts.
const INTL_LOCALE = "en-US";
const CURRENCY = "USD";
const CURRENCY_SYMBOL = "$";

/** Shown for NaN and ±Infinity instead of a misleading number. */
export const NOT_A_NUMBER = "—";

export const PERCENT_FRACTION_DIGITS = 2;

// en-US compact suffixes, i.e. the magnitude of the number.
const EN_COMPACT_UNITS: Readonly<Record<string, CompactUnit>> = {
  K: "thousand",
  M: "million",
  B: "billion",
  T: "trillion",
};

// LRM, RLM, ALM, the embedding/override controls and the isolates.
const BIDI_CONTROLS = /[‎‏؜‪-‮⁦-⁩]/g;

function mapPart(part: Intl.NumberFormatPart, spec: NumberFormatSpec): string {
  switch (part.type) {
    case "group":
      return spec.group;
    case "decimal":
      return spec.decimal;
    case "currency":
      return CURRENCY_SYMBOL;
    case "minusSign":
      return "-";
    case "plusSign":
      return "+";
    case "percentSign":
      return "%";
    case "compact": {
      const unit = EN_COMPACT_UNITS[part.value];
      if (!unit) throw new Error(`Unexpected en-US compact suffix "${part.value}"`);
      return (spec.compactSpace ? " " : "") + spec.compact[unit];
    }
    case "literal":
      return part.value.replace(BIDI_CONTROLS, "");
    default:
      return part.value;
  }
}

function format(value: number, locale: Locale, options: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(value)) return NOT_A_NUMBER;
  const spec = numberFormatSpec[locale];
  return new Intl.NumberFormat(INTL_LOCALE, options)
    .formatToParts(value)
    .map((part) => mapPart(part, spec))
    .join("");
}

export function formatPrice(value: number, locale: Locale): string {
  const abs = Math.abs(value);
  const digits: Intl.NumberFormatOptions =
    abs >= 1 || abs === 0
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : abs >= 0.01
        ? { minimumFractionDigits: 4, maximumFractionDigits: 4 }
        : // Micro-cap prices: significant digits keep precision without padding zeros.
          { maximumSignificantDigits: 8 };

  return format(value, locale, { style: "currency", currency: CURRENCY, ...digits });
}

/** `value` is already a percentage: 2.5 means 2.5%. */
export function formatPercent(value: number, locale: Locale): string {
  return format(value / 100, locale, {
    style: "percent",
    // A flat 0% has no direction, so it gets no sign.
    signDisplay: "exceptZero",
    minimumFractionDigits: PERCENT_FRACTION_DIGITS,
    maximumFractionDigits: PERCENT_FRACTION_DIGITS,
  });
}

export function formatCompactCurrency(value: number, locale: Locale): string {
  return format(value, locale, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumSignificantDigits: 3,
  });
}
