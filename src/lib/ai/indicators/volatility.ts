import { assertFiniteSeries, assertPeriod } from "./series";

export const DEFAULT_VOLATILITY_DAYS = 30;

/**
 * Daily volatility in percent: the sample standard deviation (n - 1) of the last `days` daily
 * simple returns (close / previous close - 1). Needs days + 1 closes; null with fewer, or when a
 * close in the window is not positive (the return is undefined).
 */
export function dailyVolatilityPct(
  closes: readonly number[],
  days = DEFAULT_VOLATILITY_DAYS,
): number | null {
  assertPeriod(days, "days");
  assertFiniteSeries(closes, "closes");
  // One return has no spread to measure.
  if (days < 2 || closes.length < days + 1) return null;

  const window = closes.slice(-(days + 1));
  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const previous = window[i - 1] ?? 0;
    if (!(previous > 0)) return null;
    returns.push((window[i] ?? 0) / previous - 1);
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * 100;
}
