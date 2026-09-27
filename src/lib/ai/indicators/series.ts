/**
 * Input guards shared by the indicators. A NaN or Infinity would silently poison every average
 * after it, so bad input throws instead of producing a plausible-looking number.
 */
export function assertFiniteSeries(values: readonly number[], name: string): void {
  if (!values.every(Number.isFinite)) {
    throw new RangeError(`${name} must contain only finite numbers`);
  }
}

export function assertPeriod(period: number, name = "period"): void {
  if (!Number.isInteger(period) || period < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

/** Percent distance of `value` from `reference`: 10 means 10% above. Null without a usable base. */
export function percentFrom(value: number, reference: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || !(reference > 0)) return null;
  return (value / reference - 1) * 100;
}
