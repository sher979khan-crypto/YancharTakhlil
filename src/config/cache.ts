/** Cache lifetimes in seconds. The single source for every TTL in the app. */
export const cacheTtl = {
  markets: 120,
  coinDetail: 120,
  dailyPrices: 1800,
  globalMarket: 600,
  /** CDN lifetime of a /api/v1 404, so junk ids do not reach the provider on every request. */
  apiNotFound: 60,
  /** Per coin + locale (CDN and the in-process AI cache). */
  aiAnalysis: 900,
  /**
   * A rule-based "basic" result (the model chain failed or was busy) is kept only briefly, so the
   * next visitor gets another chance at an AI answer.
   */
  aiBasic: 120,
  /** CDN stale-while-revalidate for an analysis: shorter than the usual 5x ttl. */
  aiAnalysisStaleWhileRevalidate: 300,
  /** How often client components poll /api/v1 for fresh prices. */
  clientPolling: 60,
} as const;
