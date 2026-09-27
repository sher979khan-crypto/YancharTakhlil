import type { Coin } from "./market";

/** How close to $1 a price must be, in USD. */
export const STABLECOIN_PRICE_TOLERANCE_USD = 0.02;
/** How flat the 7-day move must be, in percent. */
export const STABLECOIN_MAX_ABS_CHANGE_7D_PCT = 0.5;

type WatchedCoin = Pick<Coin, "id" | "symbol" | "priceUsd" | "change7dPct">;

/**
 * Coins that look like USD stablecoins: priced within $0.02 of $1 and moving at most 0.5% over 7
 * days. An early warning only (a new stablecoin missing from excluded-coins.json); callers log
 * the result and never exclude on it, because a real coin can trade near $1 for a week.
 */
export function findPossibleStablecoins<T extends WatchedCoin>(coins: readonly T[]): T[] {
  return coins.filter(
    ({ priceUsd, change7dPct }) =>
      change7dPct !== null &&
      // Bounds instead of |price - 1|: 0.98 - 1 is -0.020000000000000018 in floating point.
      priceUsd >= 1 - STABLECOIN_PRICE_TOLERANCE_USD &&
      priceUsd <= 1 + STABLECOIN_PRICE_TOLERANCE_USD &&
      Math.abs(change7dPct) <= STABLECOIN_MAX_ABS_CHANGE_7D_PCT,
  );
}
