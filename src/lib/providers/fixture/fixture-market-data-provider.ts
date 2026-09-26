import * as z from "zod";

import snapshotJson from "@/data/fixtures/market-snapshot.json";
import { filterTopCoins, isAllowedCoinId } from "@/lib/domain/coin-filter";
import { MarketDataError } from "@/lib/domain/errors";
import {
  CoinDetailSchema,
  CoinSchema,
  GlobalMarketSchema,
  type CoinDetail,
  type MarketResult,
} from "@/lib/domain/market";

import type { ContentRepository } from "../content-repository";
import { createJsonContentRepository } from "../json/json-content-repository";
import type { MarketDataProvider } from "../market-data-provider";

import { generateDailyPrices } from "./daily-prices";

export const MarketSnapshotSchema = z.object({
  capturedAt: z.iso.datetime({ offset: true }),
  note: z.string().min(1),
  global: GlobalMarketSchema,
  coins: z
    .array(CoinDetailSchema)
    .refine((coins) => new Set(coins.map((coin) => coin.id)).size === coins.length, {
      message: "Coin ids must be unique",
    }),
});

// Static import + parse at module load, so a broken fixture fails the tests and the build loudly.
const snapshot = MarketSnapshotSchema.parse(snapshotJson);

type FixtureMarketDataProviderOptions = {
  contentRepository?: ContentRepository;
};

/**
 * Sample market data for development without an API key. Every result says source "fixture",
 * which makes the UI show the demo-data banner; these numbers must never be presented as real.
 */
export function createFixtureMarketDataProvider({
  contentRepository = createJsonContentRepository(),
}: FixtureMarketDataProviderOptions = {}): MarketDataProvider {
  const details = filterTopCoins(snapshot.coins, contentRepository.getExcludedCoins());
  // Parsing with the narrower schema strips the detail-only fields.
  const topCoins = details.map((detail) => CoinSchema.parse(detail));
  const seedDate = snapshot.capturedAt.slice(0, 10);

  function result<T>(data: T): MarketResult<T> {
    // Callers get their own copy; the snapshot is shared by every request.
    return {
      data: structuredClone(data),
      source: "fixture",
      fetchedAt: snapshot.capturedAt,
      stale: false,
    };
  }

  function findDetail(id: string): CoinDetail {
    const detail = isAllowedCoinId(id, topCoins)
      ? details.find((coin) => coin.id === id)
      : undefined;
    if (!detail) throw new MarketDataError("NOT_FOUND", "Coin not found");
    return detail;
  }

  return {
    async getTopCoins() {
      return result(topCoins);
    },
    async getCoinDetail(id) {
      return result(findDetail(id));
    },
    async getDailyPrices(id, range) {
      return result(generateDailyPrices(findDetail(id), range, seedDate));
    },
    async getGlobalMarket() {
      return result(snapshot.global);
    },
  };
}
