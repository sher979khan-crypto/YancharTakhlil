import { describe, expect, it, vi } from "vitest";

import snapshotJson from "@/data/fixtures/market-snapshot.json";
import { MarketDataError } from "@/lib/domain/errors";
import { createFixtureMarketDataProvider } from "@/lib/providers/fixture/fixture-market-data-provider";
import type { MarketDataProvider } from "@/lib/providers/market-data-provider";

import { AnalysisInputSchema } from "./analysis-input";
import { collectNumbers } from "./collect-numbers";
import { loadAnalysisInput } from "./load-analysis-input";

const NOW = new Date("2026-09-27T12:00:00.000Z");
const now = () => NOW;

function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

describe("loadAnalysisInput with the fixture provider", () => {
  const provider = createFixtureMarketDataProvider();

  it.each(["bitcoin", "pepe"])("builds a complete, compact input for %s", async (id) => {
    const result = await loadAnalysisInput(id, { provider, now });
    const { data } = result;
    expect(result).toMatchObject({
      source: "fixture",
      stale: false,
      fetchedAt: snapshotJson.capturedAt,
    });
    expect(AnalysisInputSchema.parse(data)).toEqual(data);
    expect(data.coin.id).toBe(id);
    expect(data.history.dailyPoints).toBe(90);
    expect(data.dataQuality.limitedHistory).toBe(false);
    expect(data.context).not.toBeNull();
    for (const [key, value] of Object.entries(data.indicators)) expect(value, key).not.toBeNull();
    expect(byteSize(data)).toBeLessThanOrEqual(2048);
    expect(collectNumbers(data)).toContain(data.price.usd);
  });

  it("keeps a sub-cent price to 6 significant digits (pepe)", async () => {
    const { data } = await loadAnalysisInput("pepe", { provider, now });
    const detail = await provider.getCoinDetail("pepe");
    expect(data.price.usd).toBeLessThan(0.001);
    expect(data.price.usd).toBe(Number(detail.data.priceUsd.toPrecision(6)));
  });

  it("propagates NOT_FOUND for coins outside the top list", async () => {
    await expect(loadAnalysisInput("tether", { provider, now })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("loadAnalysisInput with a fake provider", () => {
  function fakeProvider(overrides: Partial<MarketDataProvider>): MarketDataProvider {
    return { ...createFixtureMarketDataProvider(), ...overrides };
  }

  it("requests 90 daily points", async () => {
    const fixture = createFixtureMarketDataProvider();
    const getDailyPrices = vi.fn(fixture.getDailyPrices);
    await loadAnalysisInput("bitcoin", { provider: fakeProvider({ getDailyPrices }), now });
    expect(getDailyPrices).toHaveBeenCalledWith("bitcoin", 90);
  });

  it("degrades to context null when the global market fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = fakeProvider({
      getGlobalMarket: () => Promise.reject(new MarketDataError("UPSTREAM", "down")),
    });
    const { data } = await loadAnalysisInput("bitcoin", { provider, now });
    expect(data.context).toBeNull();
    expect(data.dataQuality.missing).toContain("context");
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("propagates a NOT_FOUND from the daily series", async () => {
    const provider = fakeProvider({
      getDailyPrices: () => Promise.reject(new MarketDataError("NOT_FOUND", "Coin not found")),
    });
    await expect(loadAnalysisInput("bitcoin", { provider, now })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("is stale when any part was served stale", async () => {
    const fixture = createFixtureMarketDataProvider();
    const provider = fakeProvider({
      getGlobalMarket: async () => ({ ...(await fixture.getGlobalMarket()), stale: true }),
    });
    const result = await loadAnalysisInput("bitcoin", { provider, now });
    expect(result.stale).toBe(true);
  });
});
