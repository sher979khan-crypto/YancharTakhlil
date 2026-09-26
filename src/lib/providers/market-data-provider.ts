import type {
  ChartRange,
  Coin,
  CoinDetail,
  DailyPrice,
  GlobalMarket,
  MarketResult,
} from "@/lib/domain/market";

/**
 * The only way the app reads market data. Implementations: fixture (sample data, no key) and,
 * from Step 6, CoinGecko. Failures throw MarketDataError.
 */
export interface MarketDataProvider {
  /** The public top list: excluded coins removed, sorted and re-ranked 1..n, at most 99 coins. */
  getTopCoins(): Promise<MarketResult<Coin[]>>;
  /** Throws MarketDataError "NOT_FOUND" for any id outside the top list. */
  getCoinDetail(id: string): Promise<MarketResult<CoinDetail>>;
  /** Exactly `range` daily points, ascending by date. Throws "NOT_FOUND" like getCoinDetail. */
  getDailyPrices(id: string, range: ChartRange): Promise<MarketResult<DailyPrice[]>>;
  getGlobalMarket(): Promise<MarketResult<GlobalMarket>>;
}
