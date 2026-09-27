import { assertFiniteSeries, assertPeriod, percentFrom } from "./series";

export type PriceLevels = {
  /** Lowest close in the window: a support proxy. */
  low: number;
  /** Highest close in the window: a resistance proxy. */
  high: number;
  /** Price vs. the low in percent (>= 0 unless the price broke below it). */
  fromLowPct: number | null;
  /** Price vs. the high in percent (<= 0 unless the price broke above it). */
  fromHighPct: number | null;
};

/**
 * Lowest and highest close over the last `days` closes, and how far `price` sits from each. Null
 * with fewer than `days` closes: a shorter window would not be the range the label promises.
 */
export function priceLevels(
  closes: readonly number[],
  price: number,
  days: number,
): PriceLevels | null {
  assertPeriod(days, "days");
  assertFiniteSeries(closes, "closes");
  if (closes.length < days) return null;
  const window = closes.slice(-days);
  const low = Math.min(...window);
  const high = Math.max(...window);
  return {
    low,
    high,
    fromLowPct: percentFrom(price, low),
    fromHighPct: percentFrom(price, high),
  };
}
