import * as z from "zod";

// Money is always USD. Percentages are plain numbers: 2.5 means 2.5%.
// z.number() already rejects NaN and ±Infinity.
const usd = z.number().nonnegative();
const pct = z.number();
// Offsets are accepted because upstream APIs are not guaranteed to send "Z".
const isoDateTime = z.iso.datetime({ offset: true });

export const CoinSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1).uppercase(),
  name: z.string().min(1),
  imageUrl: z.url({ protocol: /^https?$/ }).nullable(),
  rank: z.int().min(1),
  priceUsd: usd,
  marketCapUsd: usd,
  volume24hUsd: usd,
  change1hPct: pct.nullable(),
  change24hPct: pct.nullable(),
  change7dPct: pct.nullable(),
  high24hUsd: usd.nullable(),
  low24hUsd: usd.nullable(),
  lastUpdated: isoDateTime,
});
export type Coin = z.infer<typeof CoinSchema>;

export const CoinDetailSchema = CoinSchema.extend({
  change30dPct: pct.nullable(),
  circulatingSupply: z.number().nonnegative().nullable(),
  totalSupply: z.number().nonnegative().nullable(),
  maxSupply: z.number().nonnegative().nullable(),
  fullyDilutedValuationUsd: usd.nullable(),
  athUsd: usd,
  athChangePct: pct,
  athDate: isoDateTime,
  atlUsd: usd,
  atlChangePct: pct,
  atlDate: isoDateTime,
});
export type CoinDetail = z.infer<typeof CoinDetailSchema>;

export const DailyPriceSchema = z.object({
  date: z.iso.date(),
  closeUsd: usd,
  volumeUsd: usd.nullable(),
});
export type DailyPrice = z.infer<typeof DailyPriceSchema>;

export const GlobalMarketSchema = z.object({
  totalMarketCapUsd: usd,
  totalVolume24hUsd: usd,
  marketCapChange24hPct: pct,
  btcDominancePct: z.number().min(0).max(100),
  ethDominancePct: z.number().min(0).max(100),
  updatedAt: isoDateTime,
});
export type GlobalMarket = z.infer<typeof GlobalMarketSchema>;

/** Chart ranges in days. */
export const CHART_RANGES = [7, 30, 90] as const;
export const ChartRangeSchema = z.literal(CHART_RANGES);
export type ChartRange = z.infer<typeof ChartRangeSchema>;

export const DataSourceSchema = z.enum(["coingecko", "fixture"]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/** Everything a MarketResult carries besides its data. */
export const MarketResultMetaSchema = z.object({
  /** "fixture" means sample data: the UI must show the demo-data banner. */
  source: DataSourceSchema,
  fetchedAt: isoDateTime,
  /** True when the provider served cached data after a failed refresh. */
  stale: z.boolean(),
});

export type MarketResult<T> = z.infer<typeof MarketResultMetaSchema> & { data: T };

export function marketResultSchema<T extends z.ZodType>(data: T) {
  return MarketResultMetaSchema.extend({ data });
}
