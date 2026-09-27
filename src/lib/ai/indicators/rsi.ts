import { assertFiniteSeries, assertPeriod } from "./series";

export const DEFAULT_RSI_PERIOD = 14;

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  // No losses: RSI is 100 by definition; no movement at all is neutral.
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/**
 * Wilder's RSI for every close from index `period` on (oldest first). The first averages are the
 * simple mean of the first `period` gains and losses; after that each average is smoothed as
 * (previous * (period - 1) + current) / period. Empty when there are fewer than period + 1 closes.
 */
export function rsiSeries(closes: readonly number[], period = DEFAULT_RSI_PERIOD): number[] {
  assertPeriod(period);
  assertFiniteSeries(closes, "closes");
  if (closes.length < period + 1) return [];

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    avgGain += Math.max(change, 0);
    avgLoss += Math.max(-change, 0);
  }
  avgGain /= period;
  avgLoss /= period;

  const values = [rsiFromAverages(avgGain, avgLoss)];
  for (let i = period + 1; i < closes.length; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    values.push(rsiFromAverages(avgGain, avgLoss));
  }
  return values;
}

/** The latest Wilder RSI (0..100), or null with fewer than period + 1 closes. */
export function rsi(closes: readonly number[], period = DEFAULT_RSI_PERIOD): number | null {
  return rsiSeries(closes, period).at(-1) ?? null;
}
