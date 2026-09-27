import { describe, expect, it, vi } from "vitest";

import { cacheTtl } from "@/config/cache";
import { MarketDataError } from "@/lib/domain/errors";
import { SPARKLINE_POINTS } from "@/lib/domain/market";

import markets from "./__fixtures__/markets.json";
import {
  createFixtureFetch,
  FIXTURE_NOW,
  jsonResponse,
  noSleep,
  routeFixture,
} from "./__fixtures__/mock-fetch";
import { createCoinGeckoMarketDataProvider } from "./coingecko-market-data-provider";

const KEY = "test-key-not-real";

function setup() {
  let time = FIXTURE_NOW;
  const fetchImpl = createFixtureFetch();
  const log = vi.fn<(line: string) => void>();
  const provider = createCoinGeckoMarketDataProvider({
    apiKey: KEY,
    plan: "demo",
    fetchImpl,
    now: () => time,
    sleep: noSleep,
    log,
  });
  const paths = () => fetchImpl.mock.calls.map(([url]) => new URL(url).pathname);
  return {
    provider,
    fetchImpl,
    log,
    paths,
    advance: (seconds: number) => {
      time += seconds * 1000;
    },
  };
}

describe("createCoinGeckoMarketDataProvider: top list and detail", () => {
  it("returns the filtered, re-ranked top list from one markets call", async () => {
    const { provider, fetchImpl } = setup();
    const result = await provider.getTopCoins();

    expect(result).toMatchObject({
      source: "coingecko",
      stale: false,
      fetchedAt: "2026-09-26T12:00:00.000Z",
    });
    const symbols = result.data.map((coin) => coin.symbol);
    expect(symbols).toEqual([
      "BTC",
      "ETH",
      "BNB",
      "XRP",
      "SOL",
      "TRX",
      "ZEC",
      "HYPE",
      "DOGE",
      "LINK",
      "XMR",
      "WBT",
      "SPC",
    ]);
    // Excluded (USDT, USDC, WBTC), non-alphanumeric (FIGR_HELOC) and unranked (stETH) are gone.
    for (const gone of ["USDT", "USDC", "WBTC", "STETH", "FIGR_HELOC"]) {
      expect(symbols).not.toContain(gone);
    }
    expect(result.data.map((coin) => coin.rank)).toEqual(symbols.map((_, i) => i + 1));
    expect(result.data[0]).not.toHaveProperty("athUsd");

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc" +
        "&per_page=250&page=1&price_change_percentage=1h%2C24h%2C7d%2C30d&sparkline=true",
    );
    expect(init?.next).toEqual({ revalidate: cacheTtl.markets, tags: ["coingecko:markets"] });
  });

  it("serves coin details from the same markets data without extra calls", async () => {
    const { provider, fetchImpl } = setup();
    await provider.getTopCoins();
    const { data } = await provider.getCoinDetail("ripple");
    expect(data).toMatchObject({ id: "ripple", symbol: "XRP", rank: 4 });
    expect(data.athUsd).toBeGreaterThan(0);
    await provider.getCoinDetail("bitcoin");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps nullable upstream fields as null", async () => {
    const { provider } = setup();
    const { data } = await provider.getCoinDetail("sparse-coin");
    expect(data).toMatchObject({
      imageUrl: null,
      maxSupply: null,
      totalSupply: null,
      fullyDilutedValuationUsd: null,
      high24hUsd: null,
      change1hPct: null,
      sparkline7d: null,
    });
  });

  it("adds a 42-point sparkline from the same markets call", async () => {
    const { provider, fetchImpl } = setup();
    const { data } = await provider.getTopCoins();
    const bitcoin = data.find((coin) => coin.id === "bitcoin");
    expect(bitcoin?.sparkline7d).toHaveLength(SPARKLINE_POINTS);
    // The last hourly point is the current price in the sample (84160 has 4 significant digits).
    expect(bitcoin?.sparkline7d?.at(-1)).toBe(bitcoin?.priceUsd);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("treats excluded and unknown ids as NOT_FOUND", async () => {
    const { provider } = setup();
    await expect(provider.getCoinDetail("tether")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(provider.getCoinDetail("staked-ether")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("logs how many items were skipped", async () => {
    const { provider, fetchImpl, log } = setup();
    fetchImpl.mockResolvedValueOnce(jsonResponse([...markets, { id: "broken" }]));
    await provider.getTopCoins();
    expect(log).toHaveBeenCalledWith(
      "[coingecko] /coins/markets: skipped 1 malformed and 1 unranked item(s)",
    );
  });

  it("warns once per id about a possible stablecoin, without excluding it", async () => {
    const { provider, fetchImpl, log, advance } = setup();
    const tether = markets.find((item) => item.id === "tether");
    if (!tether) throw new Error("fixture has no tether");
    const newStable = { ...tether, id: "new-dollar", symbol: "ndusd", name: "New Dollar" };
    fetchImpl.mockImplementation(async () => jsonResponse([...markets, newStable]));

    const { data } = await provider.getTopCoins();
    expect(data.map((coin) => coin.id)).toContain("new-dollar");
    advance(cacheTtl.markets);
    await provider.getTopCoins();

    const warnings = log.mock.calls.filter(([line]) => line.includes("possible stablecoin"));
    expect(warnings).toEqual([
      ["[coingecko] possible stablecoin not excluded: NDUSD (new-dollar)"],
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a malformed envelope with INVALID_RESPONSE", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ error: "not a list" }));
    await expect(provider.getTopCoins()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("returns copies, so callers cannot change later results", async () => {
    const { provider } = setup();
    const first = await provider.getTopCoins();
    first.data.splice(0);
    expect((await provider.getTopCoins()).data).toHaveLength(13);
  });
});

describe("createCoinGeckoMarketDataProvider: caching and stale data", () => {
  it("reuses markets data within the ttl and refreshes after it", async () => {
    const { provider, paths, advance } = setup();
    await provider.getTopCoins();
    advance(cacheTtl.markets - 1);
    await provider.getTopCoins();
    expect(paths()).toEqual(["/api/v3/coins/markets"]);
    advance(1);
    await provider.getTopCoins();
    expect(paths()).toHaveLength(2);
  });

  it("serves the last good top list with stale: true when a refresh fails", async () => {
    const { provider, fetchImpl, advance } = setup();
    const fresh = await provider.getTopCoins();
    advance(cacheTtl.markets);
    fetchImpl.mockResolvedValue(jsonResponse({}, { status: 503 }));

    const stale = await provider.getTopCoins();
    expect(stale).toEqual({ ...fresh, stale: true });
    const detail = await provider.getCoinDetail("bitcoin");
    expect(detail.stale).toBe(true);
  });

  it("fails with the upstream error when there is no last good data", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValue(jsonResponse({}, { status: 429 }));
    const error = await provider.getTopCoins().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MarketDataError);
    expect(error).toMatchObject({ code: "RATE_LIMITED" });
    expect(String(error)).not.toContain(KEY);
  });
});

describe("createCoinGeckoMarketDataProvider: daily prices", () => {
  it("checks the whitelist before calling the chart endpoint", async () => {
    const { provider, paths } = setup();
    await provider.getTopCoins();
    await expect(provider.getDailyPrices("not-a-coin", 7)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(provider.getDailyPrices("wrapped-bitcoin", 30)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(paths()).toEqual(["/api/v3/coins/markets"]);
  });

  it("requests daily points for the range and returns exactly that many", async () => {
    const { provider, fetchImpl, paths } = setup();
    const result = await provider.getDailyPrices("bitcoin", 30);
    expect(result).toMatchObject({ source: "coingecko", stale: false });
    expect(result.data).toHaveLength(30);
    expect(result.data.at(-1)?.date).toBe("2026-09-26");

    expect(paths()).toEqual(["/api/v3/coins/markets", "/api/v3/coins/bitcoin/market_chart"]);
    const [url, init] = fetchImpl.mock.calls[1] ?? [];
    expect(new URL(url ?? "").search).toBe("?vs_currency=usd&days=30&interval=daily");
    expect(init?.next).toEqual({
      revalidate: cacheTtl.dailyPrices,
      tags: ["coingecko:chart:bitcoin"],
    });
  });

  it("caches each id and fetched range separately", async () => {
    const { provider, paths } = setup();
    await provider.getDailyPrices("bitcoin", 30);
    await provider.getDailyPrices("bitcoin", 30);
    await provider.getDailyPrices("bitcoin", 90);
    expect(paths().filter((path) => path.endsWith("/market_chart"))).toHaveLength(2);
  });

  it("serves 7 days as the tail of the cached 30-day series (no extra call)", async () => {
    const { provider, fetchImpl } = setup();
    const month = await provider.getDailyPrices("bitcoin", 30);
    const week = await provider.getDailyPrices("bitcoin", 7);
    expect(week.data).toEqual(month.data.slice(-7));
    expect(week.fetchedAt).toBe(month.fetchedAt);

    const charts = fetchImpl.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/market_chart"),
    );
    expect(charts).toHaveLength(1);
    expect(new URL(charts[0]?.[0] ?? "").searchParams.get("days")).toBe("30");
  });

  it("fetches 30 days when 7 is asked first, then reuses it for 30", async () => {
    const { provider, fetchImpl } = setup();
    const week = await provider.getDailyPrices("bitcoin", 7);
    expect(week.data).toHaveLength(7);
    await provider.getDailyPrices("bitcoin", 30);
    const days = fetchImpl.mock.calls
      .map(([url]) => new URL(url))
      .filter((url) => url.pathname.endsWith("/market_chart"))
      .map((url) => url.searchParams.get("days"));
    expect(days).toEqual(["30"]);
  });

  function serveChart(fetchImpl: ReturnType<typeof setup>["fetchImpl"], prices: number[][]) {
    fetchImpl.mockImplementation(async (input) =>
      new URL(input).pathname.endsWith("/market_chart")
        ? jsonResponse({ prices, total_volumes: [] })
        : routeFixture(input),
    );
  }

  it("returns a series shorter than the range as is (young coin)", async () => {
    const { provider, fetchImpl } = setup();
    const day = 86_400_000;
    serveChart(fetchImpl, [
      [FIXTURE_NOW - 2 * day, 1],
      [FIXTURE_NOW - day, 2],
      [FIXTURE_NOW, 3],
    ]);
    const result = await provider.getDailyPrices("bitcoin", 7);
    expect(result.data.map((point) => [point.date, point.closeUsd])).toEqual([
      ["2026-09-24", 1],
      ["2026-09-25", 2],
      ["2026-09-26", 3],
    ]);
  });

  it("rejects a series with fewer than 2 points", async () => {
    const { provider, fetchImpl } = setup();
    serveChart(fetchImpl, [[FIXTURE_NOW, 1]]);
    await expect(provider.getDailyPrices("bitcoin", 7)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});

describe("createCoinGeckoMarketDataProvider: global market", () => {
  it("maps /global", async () => {
    const { provider, fetchImpl } = setup();
    const result = await provider.getGlobalMarket();
    expect(result).toMatchObject({
      source: "coingecko",
      stale: false,
      data: { btcDominancePct: 56.75, ethDominancePct: 11.62 },
    });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.coingecko.com/api/v3/global");
    expect(init?.next).toEqual({ revalidate: cacheTtl.globalMarket, tags: ["coingecko:global"] });
  });

  it("rejects a malformed global response", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ data: { total_market_cap: "lots" } }));
    await expect(provider.getGlobalMarket()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
