import "server-only";

import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import { PERCENT_DECIMALS } from "@/lib/ai/indicators/rounding";
import type { Locale } from "@/lib/i18n/config";
import {
  formatCompactCurrency,
  formatDecimal,
  formatPercent,
  formatPercentUnsigned,
  formatPrice,
} from "@/lib/i18n/format";

import {
  DISPLAY_FORMATS,
  DISPLAY_KEYS,
  readMetric,
  type DisplayFormat,
  type DisplayKey,
} from "./metrics";

/** Pre-formatted values for the model to copy and for the UI to show next to the AI text. */
export type AnalysisDisplay = Partial<Record<DisplayKey, string>>;

function formatValue(value: number, format: Exclude<DisplayFormat, "trend">, locale: Locale) {
  switch (format) {
    case "price":
      return formatPrice(value, locale);
    case "change":
      return formatPercent(value, locale);
    case "share":
      return formatPercentUnsigned(value, locale);
    case "largeUsd":
      return formatCompactCurrency(value, locale);
    case "score":
      return formatDecimal(value, locale, PERCENT_DECIMALS);
  }
}

/**
 * Every display key with a known value, formatted for `locale` through format.ts. Unknown (null)
 * values are left out. The trend stays the enum word ("up" | "down" | "flat").
 */
export function buildDisplay(input: AnalysisInput, locale: Locale): AnalysisDisplay {
  const display: AnalysisDisplay = {};
  for (const key of DISPLAY_KEYS) {
    const value = readMetric(input, key);
    const format = DISPLAY_FORMATS[key];
    if (typeof value === "string" && format === "trend") display[key] = value;
    else if (typeof value === "number" && format !== "trend") {
      display[key] = formatValue(value, format, locale);
    }
  }
  return display;
}
