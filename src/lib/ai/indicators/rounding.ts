/**
 * The one rounding policy for everything the AI Analyst sees. Rounding keeps the input small and
 * makes every number the LLM may cite an exact, checkable value. Every helper maps null and
 * non-finite input to null and never returns -0 (JSON prints it as 0, which would not match).
 */

export const PERCENT_DECIMALS = 2;
export const RATIO_DECIMALS = 4;
/** Enough for a sub-cent token such as 0.00000981234 and for BTC to the cent. */
export const PRICE_SIGNIFICANT_DIGITS = 6;
/** Market caps and volumes: 1.23e12 says as much as the LLM needs. */
export const LARGE_USD_SIGNIFICANT_DIGITS = 3;

function normalize(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  // -0 === 0, so this turns -0 into +0.
  return value === 0 ? 0 : value;
}

export function roundDecimals(value: number | null, decimals: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return normalize(Number(value.toFixed(decimals)));
}

export function roundSignificant(value: number | null, digits: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (value === 0) return 0;
  return normalize(Number(value.toPrecision(digits)));
}

/** Percentages (2.5 means 2.5%), including RSI and other 0..100 scores: 2 decimals. */
export function roundPct(value: number | null): number | null {
  return roundDecimals(value, PERCENT_DECIMALS);
}

/** USD prices (price, SMA, support/resistance, ATH/ATL): 6 significant digits. */
export function roundUsdPrice(value: number | null): number | null {
  return roundSignificant(value, PRICE_SIGNIFICANT_DIGITS);
}

/** Large USD amounts (market cap, volume, FDV): 3 significant digits. */
export function roundUsdLarge(value: number | null): number | null {
  return roundSignificant(value, LARGE_USD_SIGNIFICANT_DIGITS);
}

/** Plain ratios (0.1234): 4 decimals. */
export function roundRatio(value: number | null): number | null {
  return roundDecimals(value, RATIO_DECIMALS);
}
