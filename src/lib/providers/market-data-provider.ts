import type {
  ChartRange,
  Coin,
  CoinDetail,
  DailyPrice,
  GlobalMarket,
  MarketResult,
} from "@/lib/domain/market";

/** A chart needs at least two points; a shorter series is an invalid upstream response. */
export const MIN_DAILY_POINTS = 2;

/**
 * The only way the app reads market data. Implementations: fixture (sample data, no key) and
 * CoinGecko. Failures throw MarketDataError.
 */
export interface MarketDataProvider {
  /** The public top list: excluded coins removed, sorted and re-ranked 1..n, at most 99 coins. */
  getTopCoins(): Promise<MarketResult<Coin[]>>;
  /** Throws MarketDataError "NOT_FOUND" for any id outside the top list. */
  getCoinDetail(id: string): Promise<MarketResult<CoinDetail>>;
  /**
   * Up to `range` daily points (the most recent days), ascending by date with no duplicates. Fewer
   * than `range` is valid (young coin, upstream gaps); fewer than 2 throws "INVALID_RESPONSE".
   * Throws "NOT_FOUND" like getCoinDetail.
   */
  getDailyPrices(id: string, range: ChartRange): Promise<MarketResult<DailyPrice[]>>;
  getGlobalMarket(): Promise<MarketResult<GlobalMarket>>;
}
