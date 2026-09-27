import "server-only";

import { MarketDataError } from "@/lib/domain/errors";
import { downsample } from "@/lib/domain/market-list";
import {
  CoinDetailSchema,
  SPARKLINE_POINTS,
  SparklineSchema,
  DailyPriceSchema,
  GlobalMarketSchema,
  type CoinDetail,
  type DailyPrice,
  type GlobalMarket,
} from "@/lib/domain/market";

import {
  MarketItemSchema,
  type GlobalResponse,
  type MarketChartResponse,
  type MarketItem,
} from "./schemas";

/** Normalizes any parseable date to ISO 8601 UTC ("...Z"); null when missing or invalid. */
export function toIsoDateTime(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Only https images reach the UI; anything else (http, data:, garbage) becomes null. */
export function toHttpsUrl(value: string | null | undefined): string | null {
  if (!value || !URL.canParse(value)) return null;
  return new URL(value).protocol === "https:" ? value : null;
}

/**
 * A 32px-tall line needs far less than the 17 digits upstream sends; 5 significant digits is
 * 0.01% of the price and cuts the /api/v1/coins payload (polled every minute) roughly in half.
 */
export const SPARKLINE_SIGNIFICANT_DIGITS = 5;

/**
 * CoinGecko's hourly 7-day sparkline, gaps dropped, reduced to SPARKLINE_POINTS (first and last
 * kept) and rounded. Null when it is missing or too short to draw, so one bad sparkline never
 * drops the coin.
 */
export function mapSparkline(sparkline: MarketItem["sparkline_in_7d"]): number[] | null {
  const prices = (sparkline?.price ?? []).filter((price): price is number => price !== null);
  const points = downsample(prices, SPARKLINE_POINTS).map((price) =>
    Number(price.toPrecision(SPARKLINE_SIGNIFICANT_DIGITS)),
  );
  const result = SparklineSchema.safeParse(points);
  return result.success ? result.data : null;
}

export type MarketItemResult =
  | { ok: true; coin: CoinDetail }
  /** "unranked": no rank or price (expected upstream, e.g. wrapped tokens). "invalid": malformed. */
  | { ok: false; reason: "unranked" | "invalid" };

function toCandidate(item: MarketItem, fallbackUpdatedAt: string) {
  return {
    id: item.id,
    symbol: item.symbol.toUpperCase(),
    name: item.name,
    imageUrl: toHttpsUrl(item.image),
    rank: item.market_cap_rank,
    priceUsd: item.current_price,
    marketCapUsd: item.market_cap,
    volume24hUsd: item.total_volume,
    change1hPct: item.price_change_percentage_1h_in_currency ?? null,
    change24hPct: item.price_change_percentage_24h_in_currency ?? null,
    change7dPct: item.price_change_percentage_7d_in_currency ?? null,
    high24hUsd: item.high_24h ?? null,
    low24hUsd: item.low_24h ?? null,
    lastUpdated: toIsoDateTime(item.last_updated) ?? fallbackUpdatedAt,
    sparkline7d: mapSparkline(item.sparkline_in_7d),
    change30dPct: item.price_change_percentage_30d_in_currency ?? null,
    circulatingSupply: item.circulating_supply ?? null,
    totalSupply: item.total_supply ?? null,
    maxSupply: item.max_supply ?? null,
    fullyDilutedValuationUsd: item.fully_diluted_valuation ?? null,
    athUsd: item.ath,
    athChangePct: item.ath_change_percentage,
    athDate: toIsoDateTime(item.ath_date),
    atlUsd: item.atl,
    atlChangePct: item.atl_change_percentage,
    atlDate: toIsoDateTime(item.atl_date),
  };
}

/**
 * One /coins/markets item to a CoinDetail. The domain schema is the final check, so a value the
 * domain cannot hold (e.g. a missing market cap or ATH) marks the item invalid instead of throwing.
 */
export function mapMarketItem(raw: unknown, fallbackUpdatedAt: string): MarketItemResult {
  const parsed = MarketItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const item = parsed.data;
  if (item.market_cap_rank === null || item.current_price === null) {
    return { ok: false, reason: "unranked" };
  }
  const coin = CoinDetailSchema.safeParse(toCandidate(item, fallbackUpdatedAt));
  return coin.success ? { ok: true, coin: coin.data } : { ok: false, reason: "invalid" };
}

export type MappedMarkets = {
  coins: CoinDetail[];
  /** Items dropped for having no rank or price. */
  unranked: number;
  /** Malformed items that were skipped. */
  invalid: number;
};

export function mapMarkets(items: readonly unknown[], fallbackUpdatedAt: string): MappedMarkets {
  const mapped: MappedMarkets = { coins: [], unranked: 0, invalid: 0 };
  const seen = new Set<string>();
  for (const raw of items) {
    const result = mapMarketItem(raw, fallbackUpdatedAt);
    if (!result.ok) {
      mapped[result.reason] += 1;
    } else if (seen.has(result.coin.id)) {
      // A duplicate id would break the unique-id promise of the top list.
      mapped.invalid += 1;
    } else {
      seen.add(result.coin.id);
      mapped.coins.push(result.coin);
    }
  }
  return mapped;
}

/** UTC date → the value of that day's last point. Null values and bad timestamps are ignored. */
function lastValuePerUtcDay(points: readonly (readonly [number, number | null])[]) {
  const byDay = new Map<string, number>();
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  for (const [timestamp, value] of sorted) {
    const iso = toIsoDateTime(timestamp);
    if (iso === null || value === null) continue;
    byDay.set(iso.slice(0, 10), value);
  }
  return byDay;
}

/**
 * market_chart with interval=daily returns one point per day at 00:00 UTC plus a final "now"
 * point on today's date (days=N gives N+1 points). Bucketing by UTC date and keeping the last
 * point of each day folds "now" into today; the last `range` days are returned ascending.
 * May return fewer than `range` points (young coin, gaps); the caller decides what that means.
 */
export function mapDailyPrices(chart: MarketChartResponse, range: number): DailyPrice[] {
  const closes = lastValuePerUtcDay(chart.prices);
  const volumes = lastValuePerUtcDay(chart.total_volumes ?? []);
  const points: DailyPrice[] = [];
  for (const date of [...closes.keys()].sort()) {
    const point = DailyPriceSchema.safeParse({
      date,
      closeUsd: closes.get(date),
      volumeUsd: volumes.get(date) ?? null,
    });
    if (point.success) points.push(point.data);
  }
  return points.slice(-range);
}

export function mapGlobalMarket({ data }: GlobalResponse): GlobalMarket {
  const result = GlobalMarketSchema.safeParse({
    totalMarketCapUsd: data.total_market_cap.usd,
    totalVolume24hUsd: data.total_volume.usd,
    marketCapChange24hPct: data.market_cap_change_percentage_24h_usd,
    btcDominancePct: data.market_cap_percentage.btc,
    ethDominancePct: data.market_cap_percentage.eth,
    updatedAt: toIsoDateTime(data.updated_at * 1000),
  });
  if (!result.success) {
    throw new MarketDataError("INVALID_RESPONSE", "CoinGecko global data is incomplete");
  }
  return result.data;
}
