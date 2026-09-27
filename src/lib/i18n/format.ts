import type { Locale } from "./config";
import { dateFormatSpec } from "./date-format-spec";
import { numberFormatSpec, type CompactUnit, type NumberFormatSpec } from "./number-format-spec";

// Intl is only ever called with en-US: every browser and Node build ships its data, so server
// and client produce identical parts. Locale differences come from number-format-spec.ts.
const INTL_LOCALE = "en-US";
const CURRENCY = "USD";
const CURRENCY_SYMBOL = "$";

/** Shown for NaN and ±Infinity instead of a misleading number. */
export const NOT_A_NUMBER = "—";

export const PERCENT_FRACTION_DIGITS = 2;

/** Shares (e.g. BTC dominance) need less precision than price moves. */
export const SHARE_FRACTION_DIGITS = 1;

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

/**
 * A share such as market dominance: `value` is a percentage (54.2 means 54.2%), shown with one
 * fraction digit and never a sign, because it is not a move.
 */
export function formatPercentUnsigned(value: number, locale: Locale): string {
  return format(value / 100, locale, {
    style: "percent",
    signDisplay: "never",
    minimumFractionDigits: SHARE_FRACTION_DIGITS,
    maximumFractionDigits: SHARE_FRACTION_DIGITS,
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

/**
 * A plain number with a fixed number of fraction digits and no grouping, e.g. an RSI of 63.42:
 * "63.42" (en, ar), "63,42" (uz).
 */
export function formatDecimal(value: number, locale: Locale, fractionDigits: number): string {
  return format(value, locale, {
    useGrouping: false,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** A compact count without a currency, e.g. a coin supply: "19.8M". */
export function formatCompactNumber(value: number, locale: Locale): string {
  return format(value, locale, { notation: "compact", maximumSignificantDigits: 3 });
}

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * A short calendar date from an ISO date or date-time ("2026-09-27" or "2026-09-27T12:00:00Z"):
 * "Sep 27" (en), "27 سبتمبر" (ar), "27-sen" (uz); with `withYear` the year is added. The date
 * part is used as written (the API sends UTC). Never calls Intl, so server and client agree.
 * An invalid date renders as "—".
 */
export function formatShortDate(
  isoDate: string,
  locale: Locale,
  { withYear = false }: { withYear?: boolean } = {},
): string {
  const match = ISO_DATE_PREFIX.exec(isoDate);
  const [, yearText = "", monthText = "", dayText = ""] = match ?? [];
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  // Round-trip through UTC to reject impossible dates such as Feb 30.
  const check = new Date(Date.UTC(year, monthIndex, day));
  if (
    !match ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== monthIndex ||
    check.getUTCDate() !== day
  ) {
    return NOT_A_NUMBER;
  }
  const spec = dateFormatSpec[locale];
  const month = spec.months[monthIndex] ?? "";
  return withYear ? spec.dayMonthYear(day, month, year) : spec.dayMonth(day, month);
}
