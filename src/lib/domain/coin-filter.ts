import * as z from "zod";

import type { Coin } from "./market";

export const TOP_COINS_LIMIT = 99;

const lowercaseList = z.array(z.string().min(1).lowercase());

/**
 * Coins that never appear in the top list. The groups hold symbols (the reason is the group);
 * `ids` holds exact upstream ids for cases where a symbol alone is ambiguous.
 */
export const ExcludedCoinsSchema = z.strictObject({
  version: z.literal(1),
  updatedAt: z.iso.date(),
  ids: lowercaseList,
  stablecoins: lowercaseList,
  wrapped: lowercaseList,
  tokenizedAssets: lowercaseList,
  other: lowercaseList,
});
export type ExcludedCoins = z.infer<typeof ExcludedCoinsSchema>;

type RankedCoin = Pick<Coin, "id" | "symbol" | "rank">;

const ASCII_ALPHANUMERIC = /^[A-Za-z0-9]+$/;

/** Case-insensitive predicate: true when the coin's id or symbol is on the exclusion list. */
export function createExclusionMatcher(
  excluded: ExcludedCoins,
): (coin: Pick<Coin, "id" | "symbol">) => boolean {
  const ids = new Set(excluded.ids);
  const symbols = new Set([
    ...excluded.stablecoins,
    ...excluded.wrapped,
    ...excluded.tokenizedAssets,
    ...excluded.other,
  ]);
  return (coin) => ids.has(coin.id.toLowerCase()) || symbols.has(coin.symbol.toLowerCase());
}

/**
 * The public top list: excluded coins and non-ASCII-alphanumeric symbols (which break tickers and
 * URLs) are dropped, the rest is sorted by rank and re-ranked 1..n. Returns new objects.
 */
export function filterTopCoins<T extends RankedCoin>(
  coins: readonly T[],
  excluded: ExcludedCoins,
  limit: number = TOP_COINS_LIMIT,
): T[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError(`limit must be a non-negative integer, got ${limit}`);
  }
  const isExcluded = createExclusionMatcher(excluded);
  return (
    coins
      .filter((coin) => ASCII_ALPHANUMERIC.test(coin.symbol) && !isExcluded(coin))
      // filter() already returned a copy, so sorting in place leaves the input untouched.
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit)
      .map((coin, index) => ({ ...coin, rank: index + 1 }))
  );
}

/** Whitelist check: only ids from the current top list are served; everything else is a 404. */
export function isAllowedCoinId(id: string, topCoins: readonly Pick<Coin, "id">[]): boolean {
  return topCoins.some((coin) => coin.id === id);
}
