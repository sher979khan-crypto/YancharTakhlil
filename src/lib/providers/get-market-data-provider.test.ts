import { afterEach, describe, expect, it, vi } from "vitest";

import { createFixtureFetch } from "./coingecko/__fixtures__/mock-fetch";
import { selectMarketDataSource } from "./get-market-data-provider";

describe("selectMarketDataSource", () => {
  it("auto with a key → CoinGecko", () => {
    expect(
      selectMarketDataSource({ MARKET_DATA_PROVIDER: "auto", COINGECKO_API_KEY: "k" }),
    ).toEqual({ source: "coingecko", apiKey: "k" });
  });

  it("auto without a key → fixture", () => {
    expect(selectMarketDataSource({ MARKET_DATA_PROVIDER: "auto" })).toEqual({ source: "fixture" });
  });

  it("fixture → fixture, even with a key", () => {
    expect(
      selectMarketDataSource({ MARKET_DATA_PROVIDER: "fixture", COINGECKO_API_KEY: "k" }),
    ).toEqual({ source: "fixture" });
  });

  it("coingecko with a key → CoinGecko; without one → CONFIG error", () => {
    expect(
      selectMarketDataSource({ MARKET_DATA_PROVIDER: "coingecko", COINGECKO_API_KEY: "k" }),
    ).toEqual({ source: "coingecko", apiKey: "k" });
    expect(() => selectMarketDataSource({ MARKET_DATA_PROVIDER: "coingecko" })).toThrow(
      expect.objectContaining({ name: "MarketDataError", code: "CONFIG" }),
    );
  });
});

describe("getMarketDataProvider", () => {
  const KEY = "test-key-not-real";

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function freshGetMarketDataProvider(env: Record<string, string>) {
    for (const name of ["MARKET_DATA_PROVIDER", "COINGECKO_API_KEY", "COINGECKO_API_PLAN"]) {
      vi.stubEnv(name, env[name] ?? "");
    }
    vi.resetModules();
    return (await import("./get-market-data-provider")).getMarketDataProvider;
  }

  it("returns a memoized fixture provider with an empty env", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const getMarketDataProvider = await freshGetMarketDataProvider({});

    const provider = getMarketDataProvider();
    expect(getMarketDataProvider()).toBe(provider);
    const { source, data } = await provider.getTopCoins();
    expect(source).toBe("fixture");
    expect(data).toHaveLength(13);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses CoinGecko with a key, reading the plan case-insensitively", async () => {
    const fetchImpl = createFixtureFetch();
    vi.stubGlobal("fetch", fetchImpl);
    vi.spyOn(console, "info").mockImplementation(() => {});
    const getMarketDataProvider = await freshGetMarketDataProvider({
      COINGECKO_API_KEY: KEY,
      COINGECKO_API_PLAN: "Pro",
    });

    const { source } = await getMarketDataProvider().getTopCoins();
    expect(source).toBe("coingecko");
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url?.startsWith("https://pro-api.coingecko.com/api/v3/")).toBe(true);
    expect(new Headers(init?.headers).get("x-cg-pro-api-key")).toBe(KEY);
  });

  it("throws CONFIG when CoinGecko is required but no key is set", async () => {
    const getMarketDataProvider = await freshGetMarketDataProvider({
      MARKET_DATA_PROVIDER: "coingecko",
    });
    // resetModules loads a fresh MarketDataError class, so match on name and code.
    expect(() => getMarketDataProvider()).toThrow(
      expect.objectContaining({ name: "MarketDataError", code: "CONFIG" }),
    );
  });
});
