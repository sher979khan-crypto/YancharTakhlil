import type { Coin } from "./market";

// Pure list logic for the markets page. Every function returns a new array and never mutates
// its input, because the coins come from React state.

export const MARKET_TABS = ["all", "gainers", "losers"] as const;
export type MarketTab = (typeof MARKET_TABS)[number];

export const SORT_KEYS = [
  "rank",
  "name",
  "price",
  "change1h",
  "change24h",
  "change7d",
  "marketCap",
  "volume",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";
export type CoinSort = Readonly<{ key: SortKey; direction: SortDirection }>;

type ListCoin = Pick<
  Coin,
  | "name"
  | "symbol"
  | "rank"
  | "priceUsd"
  | "change1hPct"
  | "change24hPct"
  | "change7dPct"
  | "marketCapUsd"
  | "volume24hUsd"
>;

/**
 * Evenly spaced points, always keeping the first and the last. A series of `n` points or fewer
 * is returned as a copy.
 */
export function downsample<T>(points: readonly T[], n: number): T[] {
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`downsample needs n >= 2 to keep both ends, got ${n}`);
  }
  if (points.length <= n) return [...points];
  const step = (points.length - 1) / (n - 1);
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    // i * step runs from 0 to length - 1, so the index is always in range.
    const point = points[Math.round(i * step)];
    if (point !== undefined) result.push(point);
  }
  return result;
}

/** Case-insensitive match on name or symbol; a blank query keeps everything. */
export function filterBySearch<T extends Pick<Coin, "name" | "symbol">>(
  coins: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...coins];
  return coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(needle) || coin.symbol.toLowerCase().includes(needle),
  );
}

/**
 * Same as the Telegram bot: gainers are the 24h risers, biggest first; losers the 24h fallers,
 * biggest drop first. A coin without a 24h change is in neither list.
 */
export function filterByTab<T extends Pick<Coin, "change24hPct">>(
  coins: readonly T[],
  tab: MarketTab,
): T[] {
  switch (tab) {
    case "all":
      return [...coins];
    case "gainers":
      return coins
        .filter((coin) => coin.change24hPct !== null && coin.change24hPct > 0)
        .sort((a, b) => (b.change24hPct ?? 0) - (a.change24hPct ?? 0));
    case "losers":
      return coins
        .filter((coin) => coin.change24hPct !== null && coin.change24hPct < 0)
        .sort((a, b) => (a.change24hPct ?? 0) - (b.change24hPct ?? 0));
  }
}

/** The order each tab shows before the user picks a column. */
export function defaultSortForTab(tab: MarketTab): CoinSort {
  switch (tab) {
    case "all":
      return { key: "rank", direction: "asc" };
    case "gainers":
      return { key: "change24h", direction: "desc" };
    case "losers":
      return { key: "change24h", direction: "asc" };
  }
}

/** The direction a column starts with: A-Z and #1 first; for numbers, the biggest first. */
export function defaultDirectionFor(key: SortKey): SortDirection {
  return key === "rank" || key === "name" ? "asc" : "desc";
}

function sortValue(coin: ListCoin, key: SortKey): number | string | null {
  switch (key) {
    case "rank":
      return coin.rank;
    case "name":
      return coin.name;
    case "price":
      return coin.priceUsd;
    case "change1h":
      return coin.change1hPct;
    case "change24h":
      return coin.change24hPct;
    case "change7d":
      return coin.change7dPct;
    case "marketCap":
      return coin.marketCapUsd;
    case "volume":
      return coin.volume24hUsd;
  }
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "string" && typeof b === "string") {
    // A fixed "en" collation: the result must not depend on the runtime's default locale.
    return a.localeCompare(b, "en", { sensitivity: "base" });
  }
  return Number(a) - Number(b);
}

/** Stable sort; coins without a value for the key always come last, in either direction. */
export function sortCoins<T extends ListCoin>(
  coins: readonly T[],
  key: SortKey,
  direction: SortDirection,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...coins].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === null || right === null) {
      return left === right ? 0 : left === null ? 1 : -1;
    }
    return sign * compareValues(left, right);
  });
}

/** Coins on the home page ticker tape. */
export const TICKER_SIZE = 20;
/** Coins in each home page movers card. */
export const MOVERS_SIZE = 5;

/** The ticker tape: the first `size` coins by rank, whatever order the list arrives in. */
export function buildTickerItems<T extends Pick<Coin, "rank">>(
  coins: readonly T[],
  size: number = TICKER_SIZE,
): T[] {
  return [...coins].sort((a, b) => a.rank - b.rank).slice(0, size);
}

export type TopMovers<T> = Readonly<{ gainers: T[]; losers: T[] }>;

/** Top gainers and losers by 24h change, with the bot's rules (see filterByTab). */
export function buildTopMovers<T extends Pick<Coin, "change24hPct">>(
  coins: readonly T[],
  size: number = MOVERS_SIZE,
): TopMovers<T> {
  return {
    gainers: filterByTab(coins, "gainers").slice(0, size),
    losers: filterByTab(coins, "losers").slice(0, size),
  };
}
