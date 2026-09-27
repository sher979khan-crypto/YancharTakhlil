import * as z from "zod";
import { beforeAll, describe, expect, it } from "vitest";

import {
  createExclusionMatcher,
  TOP_COINS_LIMIT,
  type ExcludedCoins,
} from "@/lib/domain/coin-filter";
import { MarketDataError } from "@/lib/domain/errors";
import {
  CHART_RANGES,
  CoinDetailSchema,
  CoinSchema,
  DailyPriceSchema,
  SPARKLINE_POINTS,
  GlobalMarketSchema,
  marketResultSchema,
  type Coin,
} from "@/lib/domain/market";

import { createJsonContentRepository } from "./json/json-content-repository";
import { MIN_DAILY_POINTS, type MarketDataProvider } from "./market-data-provider";

type ContractOptions = {
  /** The list the provider was built with. Defaults to src/data/excluded-coins.json. */
  excluded?: ExcludedCoins;
};

const UNKNOWN_ID = "definitely-not-a-listed-coin";

async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(MarketDataError);
  await expect(promise).rejects.toMatchObject({ code: "NOT_FOUND" });
}

/**
 * Behaviour every MarketDataProvider must have. Call it from an implementation's test file;
 * `createProvider` runs once per suite, so a mocked fetch must be ready before it is called.
 */
export function runMarketDataProviderContract(
  name: string,
  createProvider: () => MarketDataProvider | Promise<MarketDataProvider>,
  { excluded = createJsonContentRepository().getExcludedCoins() }: ContractOptions = {},
): void {
  describe(`MarketDataProvider contract: ${name}`, () => {
    let provider: MarketDataProvider;
    let topCoins: Coin[];

    beforeAll(async () => {
      provider = await createProvider();
      const result = await provider.getTopCoins();
      topCoins = result.data;
    });

    it("returns a valid top list of at most 99 coins", async () => {
      const result = marketResultSchema(z.array(CoinSchema)).parse(await provider.getTopCoins());
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(TOP_COINS_LIMIT);
    });

    it("never returns an excluded coin or a non-alphanumeric symbol", () => {
      const isExcluded = createExclusionMatcher(excluded);
      for (const coin of topCoins) {
        expect(isExcluded(coin), coin.id).toBe(false);
        expect(coin.symbol).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it("ranks coins 1..n in order with unique ids", () => {
      expect(topCoins.map((coin) => coin.rank)).toEqual(topCoins.map((_, index) => index + 1));
      expect(new Set(topCoins.map((coin) => coin.id)).size).toBe(topCoins.length);
    });

    it("gives each coin a sparkline of 2..42 non-negative points, or null", () => {
      for (const coin of topCoins) {
        if (coin.sparkline7d === null) continue;
        expect(coin.sparkline7d.length, coin.id).toBeGreaterThanOrEqual(2);
        expect(coin.sparkline7d.length, coin.id).toBeLessThanOrEqual(SPARKLINE_POINTS);
        expect(
          coin.sparkline7d.every((price) => price >= 0),
          coin.id,
        ).toBe(true);
      }
    });

    it("returns a valid detail for a listed coin", async () => {
      const [first] = topCoins;
      expect(first).toBeDefined();
      if (!first) return;
      const result = marketResultSchema(CoinDetailSchema).parse(
        await provider.getCoinDetail(first.id),
      );
      expect(result.data).toMatchObject({ id: first.id, symbol: first.symbol, rank: first.rank });
    });

    it.each(CHART_RANGES)("returns 2..%i ascending, unique daily points", async (range) => {
      const [first] = topCoins;
      if (!first) throw new Error("empty top list");
      const result = marketResultSchema(z.array(DailyPriceSchema)).parse(
        await provider.getDailyPrices(first.id, range),
      );
      const dates = result.data.map((point) => point.date);
      expect(dates.length).toBeGreaterThanOrEqual(MIN_DAILY_POINTS);
      expect(dates.length).toBeLessThanOrEqual(range);
      // ISO dates compare correctly as strings; strictly ascending also rules out duplicates.
      expect(dates.every((date, i) => i === 0 || (dates[i - 1] ?? "") < date)).toBe(true);
    });

    it("returns the 7-day series as the tail of the 30-day series", async () => {
      const [first] = topCoins;
      if (!first) throw new Error("empty top list");
      const month = await provider.getDailyPrices(first.id, 30);
      const week = await provider.getDailyPrices(first.id, 7);
      expect(week.data).toEqual(month.data.slice(-7));
    });

    it("returns a valid global market", async () => {
      marketResultSchema(GlobalMarketSchema).parse(await provider.getGlobalMarket());
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expectNotFound(provider.getCoinDetail(UNKNOWN_ID));
      await expectNotFound(provider.getDailyPrices(UNKNOWN_ID, 7));
    });
  });
}
