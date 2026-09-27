import { describe, expect, it } from "vitest";

import { CoinDetailSchema, SPARKLINE_POINTS } from "@/lib/domain/market";

import global from "./__fixtures__/global.json";
import chart7d from "./__fixtures__/market-chart-7d.json";
import markets from "./__fixtures__/markets.json";
import {
  mapDailyPrices,
  mapGlobalMarket,
  mapMarketItem,
  mapMarkets,
  mapSparkline,
  toHttpsUrl,
  toIsoDateTime,
} from "./mappers";
import { GlobalResponseSchema, MarketChartResponseSchema } from "./schemas";

const FALLBACK = "2026-09-26T12:00:00.000Z";
const [bitcoin] = markets;
if (!bitcoin) throw new Error("fixture has no items");

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(iso);

describe("mapMarketItem", () => {
  it("maps a full item to a valid CoinDetail", () => {
    const result = mapMarketItem(bitcoin, FALLBACK);
    if (!result.ok) throw new Error("expected ok");
    expect(CoinDetailSchema.parse(result.coin)).toEqual(result.coin);
    expect(result.coin).toMatchObject({
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      rank: 1,
      priceUsd: bitcoin.current_price,
      marketCapUsd: bitcoin.market_cap,
      volume24hUsd: bitcoin.total_volume,
      change1hPct: bitcoin.price_change_percentage_1h_in_currency,
      change30dPct: bitcoin.price_change_percentage_30d_in_currency,
      maxSupply: 21_000_000,
      athDate: "2025-10-06T10:57:42.000Z",
      imageUrl: bitcoin.image,
    });
  });

  it("tolerates nulls and missing optional fields", () => {
    const result = mapMarketItem(
      {
        ...bitcoin,
        image: null,
        max_supply: null,
        total_supply: undefined,
        fully_diluted_valuation: null,
        high_24h: null,
        low_24h: null,
        price_change_percentage_1h_in_currency: null,
        price_change_percentage_7d_in_currency: undefined,
        price_change_percentage_30d_in_currency: null,
        last_updated: null,
      },
      FALLBACK,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.coin).toMatchObject({
      imageUrl: null,
      maxSupply: null,
      totalSupply: null,
      fullyDilutedValuationUsd: null,
      high24hUsd: null,
      low24hUsd: null,
      change1hPct: null,
      change7dPct: null,
      change30dPct: null,
      lastUpdated: FALLBACK,
    });
  });

  it("drops items without a rank or a price as unranked", () => {
    expect(mapMarketItem({ ...bitcoin, market_cap_rank: null }, FALLBACK)).toEqual({
      ok: false,
      reason: "unranked",
    });
    expect(mapMarketItem({ ...bitcoin, current_price: null }, FALLBACK)).toEqual({
      ok: false,
      reason: "unranked",
    });
  });

  it("marks malformed items invalid instead of throwing", () => {
    const invalid = { ok: false, reason: "invalid" };
    expect(mapMarketItem({ ...bitcoin, id: undefined }, FALLBACK)).toEqual(invalid);
    expect(mapMarketItem({ ...bitcoin, current_price: "84160" }, FALLBACK)).toEqual(invalid);
    expect(mapMarketItem({ ...bitcoin, ath: null }, FALLBACK)).toEqual(invalid);
    expect(mapMarketItem({ ...bitcoin, market_cap: -1 }, FALLBACK)).toEqual(invalid);
    expect(mapMarketItem({ ...bitcoin, atl_date: "not a date" }, FALLBACK)).toEqual(invalid);
    expect(mapMarketItem("bitcoin", FALLBACK)).toEqual(invalid);
  });
});

describe("mapMarkets", () => {
  it("keeps valid items in order and counts the rest", () => {
    const mapped = mapMarkets([...markets, { id: 42 }, bitcoin], FALLBACK);
    expect(mapped.coins.map((coin) => coin.id)).not.toContain("staked-ether");
    // markets.json has one null-rank item (stETH); the extra junk and the duplicate are invalid.
    expect(mapped).toMatchObject({ unranked: 1, invalid: 2 });
    expect(mapped.coins).toHaveLength(markets.length - 1);
    expect(mapped.coins[0]?.id).toBe("bitcoin");
  });
});

describe("mapSparkline", () => {
  const hourly = Array.from({ length: 168 }, (_, i) => 100 + i);

  it("downsamples ~168 hourly prices to 42, keeping the first and the last", () => {
    const points = mapSparkline({ price: hourly });
    expect(points).toHaveLength(SPARKLINE_POINTS);
    expect(points?.[0]).toBe(100);
    expect(points?.at(-1)).toBe(267);
    // Ascending input stays ascending: the order in time is kept.
    expect(points).toEqual([...(points ?? [])].sort((a, b) => a - b));
  });

  it("rounds to 5 significant digits", () => {
    expect(mapSparkline({ price: [80_531.500_456_826_59, 0.396_308_488_492_173_37] })).toEqual([
      80_532, 0.396_31,
    ]);
  });

  it("drops null gaps before downsampling", () => {
    const points = mapSparkline({ price: [1, null, 2, null, 3] });
    expect(points).toEqual([1, 2, 3]);
  });

  it("returns null when the sparkline is missing, empty or too short", () => {
    expect(mapSparkline(undefined)).toBeNull();
    expect(mapSparkline(null)).toBeNull();
    expect(mapSparkline({ price: [] })).toBeNull();
    expect(mapSparkline({ price: [5, null] })).toBeNull();
  });

  it("returns null for negative prices instead of dropping the coin", () => {
    expect(mapSparkline({ price: [1, -2, 3] })).toBeNull();
    const result = mapMarketItem({ ...bitcoin, sparkline_in_7d: { price: [1, -2, 3] } }, FALLBACK);
    expect(result).toMatchObject({ ok: true, coin: { sparkline7d: null } });
  });
});

describe("toHttpsUrl / toIsoDateTime", () => {
  it("keeps only https URLs", () => {
    expect(toHttpsUrl("https://coin-images.coingecko.com/a.png")).toBe(
      "https://coin-images.coingecko.com/a.png",
    );
    expect(toHttpsUrl("http://example.com/a.png")).toBeNull();
    expect(toHttpsUrl("missing_large.png")).toBeNull();
    expect(toHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(toHttpsUrl("")).toBeNull();
    expect(toHttpsUrl(null)).toBeNull();
  });

  it("normalizes dates to ISO UTC", () => {
    expect(toIsoDateTime("2013-07-05T16:00:00.000Z")).toBe("2013-07-05T16:00:00.000Z");
    expect(toIsoDateTime("2024-03-14T07:10:36+02:00")).toBe("2024-03-14T05:10:36.000Z");
    expect(toIsoDateTime(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(toIsoDateTime("nope")).toBeNull();
    expect(toIsoDateTime(undefined)).toBeNull();
  });
});

describe("mapDailyPrices", () => {
  it("turns N+1 upstream points into exactly N ascending days ending today", () => {
    const chart = MarketChartResponseSchema.parse(chart7d);
    expect(chart.prices).toHaveLength(8);
    const points = mapDailyPrices(chart, 7);
    expect(points.map((point) => point.date)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    // Today's close is the "now" point, not today's 00:00 point.
    expect(points.at(-1)?.closeUsd).toBe(chart.prices.at(-1)?.[1]);
    expect(points.at(-1)?.volumeUsd).toBe(chart.total_volumes?.at(-1)?.[1]);
  });

  it("keeps the last point of a day even when the input is unsorted", () => {
    const points = mapDailyPrices(
      {
        prices: [
          [utc("2026-09-02T18:00:00Z"), 30],
          [utc("2026-09-01T00:00:00Z"), 10],
          [utc("2026-09-02T00:00:00Z"), 20],
          [utc("2026-09-01T23:59:59Z"), 11],
        ],
      },
      2,
    );
    expect(points).toEqual([
      { date: "2026-09-01", closeUsd: 11, volumeUsd: null },
      { date: "2026-09-02", closeUsd: 30, volumeUsd: null },
    ]);
  });

  it("skips null values and returns what exists when history is short", () => {
    const start = utc("2026-09-01T00:00:00Z");
    const points = mapDailyPrices(
      {
        prices: [
          [start, 1],
          [start + DAY, null],
          [start + 2 * DAY, 3],
        ],
        total_volumes: [[start, 100]],
      },
      7,
    );
    expect(points).toEqual([
      { date: "2026-09-01", closeUsd: 1, volumeUsd: 100 },
      { date: "2026-09-03", closeUsd: 3, volumeUsd: null },
    ]);
  });
});

describe("mapGlobalMarket", () => {
  it("maps the USD figures and converts updated_at from seconds", () => {
    expect(mapGlobalMarket(GlobalResponseSchema.parse(global))).toEqual({
      totalMarketCapUsd: global.data.total_market_cap.usd,
      totalVolume24hUsd: global.data.total_volume.usd,
      marketCapChange24hPct: global.data.market_cap_change_percentage_24h_usd,
      btcDominancePct: 56.75,
      ethDominancePct: 11.62,
      updatedAt: new Date(global.data.updated_at * 1000).toISOString(),
    });
  });

  it("throws INVALID_RESPONSE when a needed figure is missing", () => {
    const response = GlobalResponseSchema.parse(global);
    delete response.data.market_cap_percentage.btc;
    expect(() => mapGlobalMarket(response)).toThrow(
      expect.objectContaining({ code: "INVALID_RESPONSE" }),
    );
  });
});
