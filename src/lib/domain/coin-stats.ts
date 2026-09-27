import type { DailyPrice } from "./market";
import { getPriceDirection, type PriceDirection } from "./price-direction";

// The precision formatPercent shows (PERCENT_FRACTION_DIGITS in format.ts): domain code stays
// free of i18n imports.
const PERCENT_FRACTION_DIGITS = 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Where `price` sits in the 24h low..high range, 0 (low) to 1 (high), clamped because the live
 * price can leave a range captured a moment earlier. Null without a usable range.
 */
export function rangePosition(
  low: number | null,
  high: number | null,
  price: number,
): number | null {
  if (low === null || high === null || !Number.isFinite(price)) return null;
  if (!(high > low)) return null;
  return clamp01((price - low) / (high - low));
}

/** Circulating / max supply, 0..1. Null when there is no max supply (or no usable numbers). */
export function supplyRatio(circulating: number | null, max: number | null): number | null {
  if (circulating === null || max === null || !(max > 0)) return null;
  return clamp01(circulating / max);
}

export type SeriesSummary = {
  /** Last close vs. first close, in percent. */
  changePct: number;
  low: number;
  high: number;
  /** Direction of the change as shown (rounded to 2 digits): picks the chart color. */
  direction: PriceDirection;
};

/** First-vs-last change and the low/high of a daily series. Null below two points. */
export function summarizeSeries(points: readonly DailyPrice[]): SeriesSummary | null {
  const first = points[0]?.closeUsd;
  const last = points.at(-1)?.closeUsd;
  if (points.length < 2 || first === undefined || last === undefined || first <= 0) return null;
  const closes = points.map((point) => point.closeUsd);
  const changePct = (last / first - 1) * 100;
  return {
    changePct,
    low: Math.min(...closes),
    high: Math.max(...closes),
    direction: getPriceDirection(changePct, PERCENT_FRACTION_DIGITS),
  };
}
