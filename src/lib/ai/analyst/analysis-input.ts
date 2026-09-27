import * as z from "zod";

import { rangePosition, supplyRatio } from "@/lib/domain/coin-stats";
import {
  CoinDetailSchema,
  DailyPriceSchema,
  GlobalMarketSchema,
  type CoinDetail,
  type DailyPrice,
  type GlobalMarket,
} from "@/lib/domain/market";
import { priceLevels } from "@/lib/ai/indicators/levels";
import { sma } from "@/lib/ai/indicators/moving-average";
import { roundPct, roundUsdLarge, roundUsdPrice } from "@/lib/ai/indicators/rounding";
import { rsi } from "@/lib/ai/indicators/rsi";
import { percentFrom } from "@/lib/ai/indicators/series";
import { dailyVolatilityPct } from "@/lib/ai/indicators/volatility";
import { volumeToMarketCapPct, volumeTrendPct } from "@/lib/ai/indicators/volume";

export const ANALYSIS_INPUT_VERSION = 1;
/** The daily history the Analyst works with (getDailyPrices(id, 90)). */
export const HISTORY_DAYS = 90;
export const RSI_PERIOD = 14;
export const SMA_SHORT_PERIOD = 20;
export const SMA_LONG_PERIOD = 50;
export const VOLATILITY_DAYS = 30;
export const LEVELS_SHORT_DAYS = 30;
export const LEVELS_LONG_DAYS = 90;
/** sma20 within ±0.5% of sma50 is "flat": a hair's difference is not a trend. */
export const TREND_DEAD_BAND_PCT = 0.5;

// z.number() rejects NaN and ±Infinity, so a parsed input is always JSON-safe.
const num = z.number().nullable();

export const TrendSchema = z.enum(["up", "down", "flat"]);
export type Trend = z.infer<typeof TrendSchema>;

/**
 * Everything the AI Analyst sees about one coin, and nothing else: the LLM never gets raw series
 * or free text. Numbers are rounded (indicators/rounding.ts) so each one the LLM cites can be
 * matched exactly; unknown values are null.
 */
export const AnalysisInputSchema = z.strictObject({
  version: z.literal(ANALYSIS_INPUT_VERSION),
  asOf: z.iso.datetime(),
  coin: z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    symbol: z.string().min(1),
    rank: z.int().min(1),
  }),
  price: z.strictObject({
    usd: z.number(),
    change1hPct: num,
    change24hPct: num,
    change7dPct: num,
    change30dPct: num,
    high24h: num,
    low24h: num,
    range24hPositionPct: num,
  }),
  market: z.strictObject({
    marketCapUsd: z.number(),
    volume24hUsd: z.number(),
    volumeToMarketCapPct: num,
    fdvUsd: num,
    circulatingToMaxPct: num,
  }),
  history: z.strictObject({
    athUsd: z.number(),
    fromAthPct: num,
    atlUsd: z.number(),
    fromAtlPct: num,
    dailyPoints: z.int().min(0),
  }),
  indicators: z.strictObject({
    rsi14: num,
    sma20: num,
    sma50: num,
    priceVsSma20Pct: num,
    priceVsSma50Pct: num,
    trend: TrendSchema.nullable(),
    volatility30dPct: num,
    low30d: num,
    high30d: num,
    low90d: num,
    high90d: num,
    fromLow30dPct: num,
    fromHigh30dPct: num,
    volumeTrend7dPct: num,
  }),
  context: z
    .strictObject({
      btcDominancePct: z.number(),
      marketCapChange24hPct: z.number(),
    })
    .nullable(),
  dataQuality: z.strictObject({
    /** Fewer daily points than HISTORY_DAYS: some long-window indicators are null. */
    limitedHistory: z.boolean(),
    /** Dot paths of every null value above, e.g. "indicators.sma50". */
    missing: z.array(z.string()),
  }),
});
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

/** Ascending, unique dates: the indicators read the series oldest first. */
export const DailySeriesSchema = z
  .array(DailyPriceSchema)
  .refine(
    (points) => points.every((point, i) => i === 0 || (points[i - 1]?.date ?? "") < point.date),
    {
      message: "Daily prices must be in strictly ascending date order",
    },
  );

/** sma20 vs. sma50 with a dead band; null when either average is unknown. */
export function classifyTrend(smaShort: number | null, smaLong: number | null): Trend | null {
  if (smaShort === null || smaLong === null) return null;
  // Rounded like every other percentage, so 99.5 vs 100 lands exactly on the band edge (the
  // raw float is -0.5000000000000004).
  const gapPct = roundPct(percentFrom(smaShort, smaLong));
  if (gapPct === null) return null;
  if (gapPct > TREND_DEAD_BAND_PCT) return "up";
  if (gapPct < -TREND_DEAD_BAND_PCT) return "down";
  return "flat";
}

/** Dot paths of every null leaf, in key order (arrays are not walked: the input has none but `missing`). */
function nullPaths(value: unknown, path: string[] = []): string[] {
  if (value === null) return [path.join(".")];
  if (typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => nullPaths(child, [...path, key]));
}

/** For values the schema requires: rounding a validated finite number never gives null. */
function required(value: number | null, name: string): number {
  if (value === null) throw new RangeError(`${name} must be a finite number`);
  return value;
}

function scaleToPct(ratio: number | null): number | null {
  return ratio === null ? null : ratio * 100;
}

/**
 * Builds the Analyst's input from provider data. Pure: `now` is a parameter. Inputs are validated
 * (finite numbers, ascending dates) and the result is parsed with AnalysisInputSchema. Only the
 * last HISTORY_DAYS daily points are used.
 */
export function buildAnalysisInput(
  detail: CoinDetail,
  daily: readonly DailyPrice[],
  global: GlobalMarket | null,
  now: Date,
): AnalysisInput {
  const coin = CoinDetailSchema.parse(detail);
  const series = DailySeriesSchema.parse(daily).slice(-HISTORY_DAYS);
  const market = GlobalMarketSchema.nullable().parse(global);
  const asOf = z.date().parse(now).toISOString();

  const price = coin.priceUsd;
  const closes = series.map((point) => point.closeUsd);
  const sma20 = sma(closes, SMA_SHORT_PERIOD);
  const sma50 = sma(closes, SMA_LONG_PERIOD);
  const levels30 = priceLevels(closes, price, LEVELS_SHORT_DAYS);
  const levels90 = priceLevels(closes, price, LEVELS_LONG_DAYS);

  const draft: Omit<AnalysisInput, "dataQuality"> = {
    version: ANALYSIS_INPUT_VERSION,
    asOf,
    coin: { id: coin.id, name: coin.name, symbol: coin.symbol, rank: coin.rank },
    price: {
      usd: required(roundUsdPrice(price), "price"),
      change1hPct: roundPct(coin.change1hPct),
      change24hPct: roundPct(coin.change24hPct),
      change7dPct: roundPct(coin.change7dPct),
      change30dPct: roundPct(coin.change30dPct),
      high24h: roundUsdPrice(coin.high24hUsd),
      low24h: roundUsdPrice(coin.low24hUsd),
      range24hPositionPct: roundPct(
        scaleToPct(rangePosition(coin.low24hUsd, coin.high24hUsd, price)),
      ),
    },
    market: {
      marketCapUsd: required(roundUsdLarge(coin.marketCapUsd), "marketCapUsd"),
      volume24hUsd: required(roundUsdLarge(coin.volume24hUsd), "volume24hUsd"),
      volumeToMarketCapPct: roundPct(volumeToMarketCapPct(coin.volume24hUsd, coin.marketCapUsd)),
      fdvUsd: roundUsdLarge(coin.fullyDilutedValuationUsd),
      circulatingToMaxPct: roundPct(
        scaleToPct(supplyRatio(coin.circulatingSupply, coin.maxSupply)),
      ),
    },
    history: {
      athUsd: required(roundUsdPrice(coin.athUsd), "athUsd"),
      // From the current price, so the distance agrees with price.usd (upstream's own
      // athChangePct can lag the price by a refresh).
      fromAthPct: roundPct(percentFrom(price, coin.athUsd)),
      atlUsd: required(roundUsdPrice(coin.atlUsd), "atlUsd"),
      fromAtlPct: roundPct(percentFrom(price, coin.atlUsd)),
      dailyPoints: series.length,
    },
    indicators: {
      rsi14: roundPct(rsi(closes, RSI_PERIOD)),
      sma20: roundUsdPrice(sma20),
      sma50: roundUsdPrice(sma50),
      priceVsSma20Pct: roundPct(sma20 === null ? null : percentFrom(price, sma20)),
      priceVsSma50Pct: roundPct(sma50 === null ? null : percentFrom(price, sma50)),
      trend: classifyTrend(sma20, sma50),
      volatility30dPct: roundPct(dailyVolatilityPct(closes, VOLATILITY_DAYS)),
      low30d: roundUsdPrice(levels30?.low ?? null),
      high30d: roundUsdPrice(levels30?.high ?? null),
      low90d: roundUsdPrice(levels90?.low ?? null),
      high90d: roundUsdPrice(levels90?.high ?? null),
      fromLow30dPct: roundPct(levels30?.fromLowPct ?? null),
      fromHigh30dPct: roundPct(levels30?.fromHighPct ?? null),
      volumeTrend7dPct: roundPct(volumeTrendPct(series.map((point) => point.volumeUsd))),
    },
    context: market
      ? {
          btcDominancePct: required(roundPct(market.btcDominancePct), "btcDominancePct"),
          marketCapChange24hPct: required(
            roundPct(market.marketCapChange24hPct),
            "marketCapChange24hPct",
          ),
        }
      : null,
  };

  return AnalysisInputSchema.parse({
    ...draft,
    dataQuality: {
      limitedHistory: series.length < HISTORY_DAYS,
      missing: nullPaths(draft),
    },
  });
}
