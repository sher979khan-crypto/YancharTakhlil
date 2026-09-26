import { describe, expect, it } from "vitest";

import snapshotJson from "@/data/fixtures/market-snapshot.json";
import { MarketDataError } from "@/lib/domain/errors";

import { runMarketDataProviderContract } from "../market-data-provider.contract";

import {
  createFixtureMarketDataProvider,
  MarketSnapshotSchema,
} from "./fixture-market-data-provider";

runMarketDataProviderContract("fixture", () => createFixtureMarketDataProvider());

describe("createFixtureMarketDataProvider", () => {
  const provider = createFixtureMarketDataProvider();

  it("uses a valid snapshot of 15 coins, one stablecoin and one wrapped token among them", () => {
    const snapshot = MarketSnapshotSchema.parse(snapshotJson);
    expect(snapshot.coins).toHaveLength(15);
    expect(snapshot.coins.map((coin) => coin.symbol)).toEqual(
      expect.arrayContaining(["USDT", "WBTC"]),
    );
    expect(snapshot.coins.some((coin) => coin.priceUsd < 0.01)).toBe(true);
  });

  it("returns 13 coins ranked 1..13 without USDT and WBTC", async () => {
    const { data } = await provider.getTopCoins();
    expect(data).toHaveLength(13);
    expect(data.map((coin) => coin.rank)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
    const symbols = data.map((coin) => coin.symbol);
    expect(symbols).not.toContain("USDT");
    expect(symbols).not.toContain("WBTC");
    expect(symbols.slice(0, 2)).toEqual(["BTC", "ETH"]);
  });

  it("marks every result as fixture data from the snapshot time", async () => {
    const results = await Promise.all([
      provider.getTopCoins(),
      provider.getCoinDetail("bitcoin"),
      provider.getDailyPrices("bitcoin", 7),
      provider.getGlobalMarket(),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({
        source: "fixture",
        stale: false,
        fetchedAt: snapshotJson.capturedAt,
      });
    }
  });

  it("returns top-list coins without the detail-only fields", async () => {
    const { data } = await provider.getTopCoins();
    expect(data[0]).not.toHaveProperty("athUsd");
  });

  it("gives the detail the re-ranked rank", async () => {
    // XRP is #4 in the snapshot and #3 once USDT is removed.
    const { data } = await provider.getCoinDetail("ripple");
    expect(data.rank).toBe(3);
  });

  it("treats excluded coins as not found", async () => {
    await expect(provider.getCoinDetail("tether")).rejects.toBeInstanceOf(MarketDataError);
    await expect(provider.getDailyPrices("wrapped-bitcoin", 7)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("ends each daily series at the coin's current price on the snapshot date", async () => {
    const [{ data: detail }, { data: series }] = await Promise.all([
      provider.getCoinDetail("shiba-inu"),
      provider.getDailyPrices("shiba-inu", 30),
    ]);
    expect(series.at(-1)).toMatchObject({
      date: snapshotJson.capturedAt.slice(0, 10),
      closeUsd: detail.priceUsd,
    });
  });

  it("returns copies, so callers cannot change later results", async () => {
    const first = await provider.getTopCoins();
    first.data.splice(0, first.data.length);
    expect((await provider.getTopCoins()).data).toHaveLength(13);
  });

  it("applies the exclusion list from its content repository", async () => {
    const custom = createFixtureMarketDataProvider({
      contentRepository: {
        getExcludedCoins: () => ({
          version: 1,
          updatedAt: "2026-09-26",
          ids: ["bitcoin"],
          stablecoins: [],
          wrapped: [],
          tokenizedAssets: [],
          other: [],
        }),
      },
    });
    const { data } = await custom.getTopCoins();
    expect(data).toHaveLength(14);
    expect(data[0]?.symbol).toBe("ETH");
  });
});
