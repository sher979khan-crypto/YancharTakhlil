import "server-only";

import * as z from "zod";

// Upstream shapes, as documented at docs.coingecko.com. Only the fields we map are listed; zod
// strips the rest. Fields CoinGecko documents as nullable accept null or absence, so one missing
// value never drops a coin; the mappers decide what the domain can live without.
const optionalNumber = z.number().nullish();
const optionalString = z.string().nullish();

export const MarketItemSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  image: optionalString,
  // Nullable upstream; the mapper drops items without a price or rank instead of failing the page.
  current_price: z.number().nullable(),
  market_cap_rank: z.int().nullable(),
  market_cap: optionalNumber,
  total_volume: optionalNumber,
  fully_diluted_valuation: optionalNumber,
  high_24h: optionalNumber,
  low_24h: optionalNumber,
  circulating_supply: optionalNumber,
  total_supply: optionalNumber,
  max_supply: optionalNumber,
  ath: optionalNumber,
  ath_change_percentage: optionalNumber,
  ath_date: optionalString,
  atl: optionalNumber,
  atl_change_percentage: optionalNumber,
  atl_date: optionalString,
  last_updated: optionalString,
  price_change_percentage_1h_in_currency: optionalNumber,
  price_change_percentage_24h_in_currency: optionalNumber,
  price_change_percentage_7d_in_currency: optionalNumber,
  price_change_percentage_30d_in_currency: optionalNumber,
  // Requested with sparkline=true: hourly prices over 7 days (~168). Gaps come back as null.
  sparkline_in_7d: z.object({ price: z.array(z.number().nullable()) }).nullish(),
});
export type MarketItem = z.infer<typeof MarketItemSchema>;

/** The envelope only: items are validated one by one so a single bad item is skipped. */
export const MarketsResponseSchema = z.array(z.unknown());

const timeValuePair = z.tuple([z.number(), z.number().nullable()]);

export const MarketChartResponseSchema = z.object({
  prices: z.array(timeValuePair),
  total_volumes: z.array(timeValuePair).optional(),
});
export type MarketChartResponse = z.infer<typeof MarketChartResponseSchema>;

export const GlobalResponseSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.string(), z.number()),
    total_volume: z.record(z.string(), z.number()),
    market_cap_percentage: z.record(z.string(), z.number()),
    market_cap_change_percentage_24h_usd: z.number(),
    /** Unix time in seconds. */
    updated_at: z.number(),
  }),
});
export type GlobalResponse = z.infer<typeof GlobalResponseSchema>;
