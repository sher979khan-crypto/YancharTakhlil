/** Cache lifetimes in seconds. The single source for every TTL in the app. */
export const cacheTtl = {
  markets: 120,
  coinDetail: 120,
  dailyPrices: 1800,
  globalMarket: 600,
  /** Per coin + locale. */
  aiAnalysis: 900,
  /** How often client components poll /api/v1 for fresh prices. */
  clientPolling: 60,
} as const;
