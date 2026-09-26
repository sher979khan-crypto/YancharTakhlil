import { afterEach, describe, expect, it, vi } from "vitest";

import { COINGECKO_NOT_READY_WARNING, selectMarketDataSource } from "./get-market-data-provider";

describe("selectMarketDataSource", () => {
  it("uses fixture data silently without a key or when asked to", () => {
    const quiet = { source: "fixture", warning: null };
    expect(selectMarketDataSource({ MARKET_DATA_PROVIDER: "auto" })).toEqual(quiet);
    expect(
      selectMarketDataSource({ MARKET_DATA_PROVIDER: "fixture", COINGECKO_API_KEY: "key" }),
    ).toEqual(quiet);
  });

  it("warns and falls back to fixture data when CoinGecko is wanted", () => {
    const warned = { source: "fixture", warning: COINGECKO_NOT_READY_WARNING };
    expect(selectMarketDataSource({ MARKET_DATA_PROVIDER: "coingecko" })).toEqual(warned);
    expect(
      selectMarketDataSource({ MARKET_DATA_PROVIDER: "auto", COINGECKO_API_KEY: "key" }),
    ).toEqual(warned);
  });
});

describe("getMarketDataProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function freshGetMarketDataProvider() {
    vi.resetModules();
    return (await import("./get-market-data-provider")).getMarketDataProvider;
  }

  it("returns a memoized fixture provider with an empty env", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "");
    vi.stubEnv("COINGECKO_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getMarketDataProvider = await freshGetMarketDataProvider();

    const provider = getMarketDataProvider();
    expect(getMarketDataProvider()).toBe(provider);
    const { source, data } = await provider.getTopCoins();
    expect(source).toBe("fixture");
    expect(data).toHaveLength(13);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once when a CoinGecko key is set", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "auto");
    vi.stubEnv("COINGECKO_API_KEY", "test-key-not-real");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getMarketDataProvider = await freshGetMarketDataProvider();

    getMarketDataProvider();
    getMarketDataProvider();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(COINGECKO_NOT_READY_WARNING);
  });
});
