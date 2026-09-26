import "server-only";

import { cacheTtl } from "@/config/cache";
import { filterTopCoins, isAllowedCoinId } from "@/lib/domain/coin-filter";
import { MarketDataError } from "@/lib/domain/errors";
import {
  CoinSchema,
  type ChartRange,
  type CoinDetail,
  type DailyPrice,
  type GlobalMarket,
  type MarketResult,
} from "@/lib/domain/market";

import type { ContentRepository } from "../content-repository";
import { createJsonContentRepository } from "../json/json-content-repository";
import type { MarketDataProvider } from "../market-data-provider";

import {
  COINGECKO_MARKETS_PER_PAGE,
  COINGECKO_PRICE_CHANGE_WINDOWS,
  type CoinGeckoPlan,
} from "./config";
import { createCoinGeckoFetch, type CoinGeckoHttpConfig } from "./http";
import { mapDailyPrices, mapGlobalMarket, mapMarkets } from "./mappers";
import { GlobalResponseSchema, MarketChartResponseSchema, MarketsResponseSchema } from "./schemas";
import { createStaleCache } from "./stale-cache";

export type CoinGeckoMarketDataProviderOptions = {
  apiKey: string;
  plan: CoinGeckoPlan;
  fetchImpl?: CoinGeckoHttpConfig["fetchImpl"];
  contentRepository?: ContentRepository;
  now?: () => number;
  /** Test hooks, passed to the HTTP layer. */
  sleep?: CoinGeckoHttpConfig["sleep"];
  timeoutMs?: number;
  log?: (line: string) => void;
};

type Fetched<T> = { data: T; fetchedAt: string };

type TopList = {
  /** The public top list, already filtered and re-ranked, with detail fields kept. */
  details: CoinDetail[];
};

function invalid(message: string): MarketDataError {
  return new MarketDataError("INVALID_RESPONSE", message);
}

/**
 * Real market data from CoinGecko. Quota plan: one /coins/markets page feeds both getTopCoins and
 * getCoinDetail (there is no /coins/{id} call); only charts and /global cost extra calls. Two
 * cache layers sit in front of the API: the Next.js data cache (shared, per deploy) and an
 * in-process cache that also serves last-good data with `stale: true` when a refresh fails.
 */
export function createCoinGeckoMarketDataProvider({
  apiKey,
  plan,
  fetchImpl,
  contentRepository = createJsonContentRepository(),
  now = Date.now,
  sleep,
  timeoutMs,
  log = (line) => console.info(line),
}: CoinGeckoMarketDataProviderOptions): MarketDataProvider {
  const coingeckoFetch = createCoinGeckoFetch({
    apiKey,
    plan,
    fetchImpl,
    now,
    sleep,
    timeoutMs,
    log,
  });
  const cache = createStaleCache({ now, log });
  const excluded = contentRepository.getExcludedCoins();

  function result<T>({ data, fetchedAt }: Fetched<T>, stale: boolean): MarketResult<T> {
    // Cached values are shared by every request, so each caller gets its own copy.
    return { data: structuredClone(data), source: "coingecko", fetchedAt, stale };
  }

  async function loadTopList() {
    return cache.load("markets", cacheTtl.markets * 1000, async (): Promise<Fetched<TopList>> => {
      const { body, receivedAt } = await coingeckoFetch(
        "/coins/markets",
        {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: String(COINGECKO_MARKETS_PER_PAGE),
          page: "1",
          price_change_percentage: COINGECKO_PRICE_CHANGE_WINDOWS,
        },
        { ttl: cacheTtl.markets, tags: ["coingecko:markets"] },
      );
      const envelope = MarketsResponseSchema.safeParse(body);
      if (!envelope.success) throw invalid("CoinGecko markets response is malformed");
      const mapped = mapMarkets(envelope.data, receivedAt);
      if (mapped.invalid > 0 || mapped.unranked > 0) {
        log(
          `[coingecko] /coins/markets: skipped ${mapped.invalid} malformed and ` +
            `${mapped.unranked} unranked item(s)`,
        );
      }
      const details = filterTopCoins(mapped.coins, excluded);
      if (details.length === 0) throw invalid("CoinGecko markets response has no usable coins");
      return { data: { details }, fetchedAt: receivedAt };
    });
  }

  async function findDetail(id: string) {
    const { value, stale } = await loadTopList();
    const detail = isAllowedCoinId(id, value.data.details)
      ? value.data.details.find((coin) => coin.id === id)
      : undefined;
    if (!detail) throw new MarketDataError("NOT_FOUND", "Coin not found");
    return { value: { data: detail, fetchedAt: value.fetchedAt }, stale };
  }

  return {
    async getTopCoins() {
      const { value, stale } = await loadTopList();
      // Parsing with the narrower schema strips the detail-only fields.
      const coins = value.data.details.map((detail) => CoinSchema.parse(detail));
      return result({ data: coins, fetchedAt: value.fetchedAt }, stale);
    },

    async getCoinDetail(id) {
      const { value, stale } = await findDetail(id);
      return result(value, stale);
    },

    async getDailyPrices(id, range: ChartRange) {
      // The whitelist check comes first: unknown ids never reach the chart endpoint.
      await findDetail(id);
      const { value, stale } = await cache.load(
        `daily:${id}:${range}`,
        cacheTtl.dailyPrices * 1000,
        async (): Promise<Fetched<DailyPrice[]>> => {
          const { body, receivedAt } = await coingeckoFetch(
            `/coins/${encodeURIComponent(id)}/market_chart`,
            { vs_currency: "usd", days: String(range), interval: "daily" },
            { ttl: cacheTtl.dailyPrices, tags: [`coingecko:chart:${id}`] },
          );
          const chart = MarketChartResponseSchema.safeParse(body);
          if (!chart.success) throw invalid("CoinGecko chart response is malformed");
          const points = mapDailyPrices(chart.data, range);
          // The interface promises exactly `range` points; a short series is not silently padded.
          if (points.length !== range) throw invalid("CoinGecko chart has too few daily points");
          return { data: points, fetchedAt: receivedAt };
        },
      );
      return result(value, stale);
    },

    async getGlobalMarket() {
      const { value, stale } = await cache.load(
        "global",
        cacheTtl.globalMarket * 1000,
        async (): Promise<Fetched<GlobalMarket>> => {
          const { body, receivedAt } = await coingeckoFetch(
            "/global",
            {},
            { ttl: cacheTtl.globalMarket, tags: ["coingecko:global"] },
          );
          const global = GlobalResponseSchema.safeParse(body);
          if (!global.success) throw invalid("CoinGecko global response is malformed");
          return { data: mapGlobalMarket(global.data), fetchedAt: receivedAt };
        },
      );
      return result(value, stale);
    },
  };
}
