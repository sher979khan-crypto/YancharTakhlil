import { assertFiniteSeries, assertPeriod } from "./series";

/** Simple moving average of the last `period` values (oldest first), or null if there are fewer. */
export function sma(values: readonly number[], period: number): number | null {
  assertPeriod(period);
  assertFiniteSeries(values, "values");
  if (values.length < period) return null;
  let sum = 0;
  for (const value of values.slice(-period)) sum += value;
  return sum / period;
}
