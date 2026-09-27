import { describe, expect, it } from "vitest";

import type { CoinDetail, DailyPrice, GlobalMarket } from "@/lib/domain/market";

import {
  AnalysisInputSchema,
  buildAnalysisInput,
  classifyTrend,
  HISTORY_DAYS,
} from "./analysis-input";

const NOW = new Date("2026-09-27T12:00:00.000Z");

/** A Bitcoin-like coin with every field set and unrounded numbers, as upstream sends them. */
const DETAIL: CoinDetail = {
  id: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  imageUrl: null,
  rank: 1,
  priceUsd: 64250.5678,
  marketCapUsd: 1_265_432_109_876,
  volume24hUsd: 38_123_456_789.12,
  change1hPct: -0.123456,
  change24hPct: 2.345678,
  change7dPct: -4.56789,
  change30dPct: 12.3456,
  high24hUsd: 65010.12,
  low24hUsd: 62890.99,
  lastUpdated: "2026-09-27T11:59:00.000Z",
  sparkline7d: null,
  circulatingSupply: 19_712_345,
  totalSupply: 21_000_000,
  maxSupply: 21_000_000,
  fullyDilutedValuationUsd: 1_349_261_923_456,
  athUsd: 73_737.94,
  athChangePct: -12.87,
  athDate: "2024-03-14T07:10:36.635Z",
  atlUsd: 67.81,
  atlChangePct: 94_650.5,
  atlDate: "2013-07-06T00:00:00.000Z",
};

const GLOBAL: GlobalMarket = {
  totalMarketCapUsd: 2_345_678_901_234,
  totalVolume24hUsd: 87_654_321_098,
  marketCapChange24hPct: -1.23456,
  btcDominancePct: 53.98765,
  ethDominancePct: 16.4321,
  updatedAt: "2026-09-27T11:58:00.000Z",
};

function isoDay(daysBeforeNow: number): string {
  return new Date(Date.UTC(2026, 8, 27) - daysBeforeNow * 86_400_000).toISOString().slice(0, 10);
}

/** `count` daily points ending today: a gentle wave around a rising line, unrounded. */
function dailySeries(count: number, lastClose = DETAIL.priceUsd): DailyPrice[] {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = count - 1 - i;
    const wave = 1 + 0.03 * Math.sin(i / 3) - 0.001 * daysAgo;
    return {
      date: isoDay(daysAgo),
      closeUsd: lastClose * wave + 0.123456,
      volumeUsd: 30_000_000_000 + 1_234_567.89 * i,
    };
  });
}

describe("buildAnalysisInput", () => {
  const input = buildAnalysisInput(DETAIL, dailySeries(HISTORY_DAYS), GLOBAL, NOW);

  it("returns a valid, JSON-safe input with coin identity and asOf from `now`", () => {
    expect(AnalysisInputSchema.parse(input)).toEqual(input);
    expect(JSON.parse(JSON.stringify(input))).toEqual(input);
    expect(input).toMatchObject({
      version: 1,
      asOf: "2026-09-27T12:00:00.000Z",
      coin: { id: "bitcoin", name: "Bitcoin", symbol: "BTC", rank: 1 },
    });
  });

  it("stays under 2 KB of JSON for a realistic coin", () => {
    expect(new TextEncoder().encode(JSON.stringify(input)).byteLength).toBeLessThanOrEqual(2048);
  });

  it("rounds with the shared policy", () => {
    expect(input.price).toMatchObject({
      usd: 64250.6,
      change1hPct: -0.12,
      change24hPct: 2.35,
      change7dPct: -4.57,
      change30dPct: 12.35,
      high24h: 65010.1,
      low24h: 62891,
    });
    expect(input.market).toMatchObject({
      marketCapUsd: 1_270_000_000_000,
      volume24hUsd: 38_100_000_000,
      fdvUsd: 1_350_000_000_000,
      volumeToMarketCapPct: 3.01,
      circulatingToMaxPct: 93.87,
    });
    expect(input.context).toEqual({ btcDominancePct: 53.99, marketCapChange24hPct: -1.23 });
  });

  it("derives position and distances from the current price", () => {
    // (64250.5678 - 62890.99) / (65010.12 - 62890.99) = 64.16%
    expect(input.price.range24hPositionPct).toBe(64.16);
    expect(input.history).toEqual({
      athUsd: 73737.9,
      fromAthPct: -12.87,
      atlUsd: 67.81,
      fromAtlPct: 94650.87,
      dailyPoints: 90,
    });
  });

  it("computes every indicator with 90 days of history", () => {
    for (const [key, value] of Object.entries(input.indicators)) {
      expect(value, key).not.toBeNull();
    }
    expect(input.indicators.rsi14).toBeGreaterThanOrEqual(0);
    expect(input.indicators.rsi14).toBeLessThanOrEqual(100);
    expect(input.dataQuality).toEqual({ limitedHistory: false, missing: [] });
  });

  it("is deterministic", () => {
    expect(buildAnalysisInput(DETAIL, dailySeries(HISTORY_DAYS), GLOBAL, NOW)).toEqual(input);
  });

  it("uses only the last 90 daily points", () => {
    const longer = buildAnalysisInput(DETAIL, dailySeries(120), GLOBAL, NOW);
    expect(longer.history.dailyPoints).toBe(90);
  });

  it("marks limited history: < 50 points leaves sma50 and trend null", () => {
    const short = buildAnalysisInput(DETAIL, dailySeries(40), GLOBAL, NOW);
    expect(short.indicators).toMatchObject({
      sma50: null,
      priceVsSma50Pct: null,
      trend: null,
      low90d: null,
      high90d: null,
    });
    expect(short.indicators.sma20).not.toBeNull();
    expect(short.indicators.rsi14).not.toBeNull();
    expect(short.dataQuality.limitedHistory).toBe(true);
    expect(short.dataQuality.missing).toEqual([
      "indicators.sma50",
      "indicators.priceVsSma50Pct",
      "indicators.trend",
      "indicators.low90d",
      "indicators.high90d",
    ]);
  });

  it("keeps the 50-day indicators with 60 points but not the 90-day levels", () => {
    const partial = buildAnalysisInput(DETAIL, dailySeries(60), GLOBAL, NOW);
    expect(partial.indicators.sma50).not.toBeNull();
    expect(partial.indicators.trend).not.toBeNull();
    expect(partial.dataQuality).toEqual({
      limitedHistory: true,
      missing: ["indicators.low90d", "indicators.high90d"],
    });
  });

  it("nulls every history indicator with the 2-point minimum", () => {
    const tiny = buildAnalysisInput(DETAIL, dailySeries(2), GLOBAL, NOW);
    const { indicators } = tiny;
    expect(Object.values(indicators).every((value) => value === null)).toBe(true);
    expect(tiny.dataQuality.missing).toHaveLength(Object.keys(indicators).length);
  });

  it("lists missing upstream fields and a missing global context", () => {
    const sparse: CoinDetail = {
      ...DETAIL,
      change1hPct: null,
      high24hUsd: null,
      maxSupply: null,
      fullyDilutedValuationUsd: null,
    };
    const result = buildAnalysisInput(sparse, dailySeries(HISTORY_DAYS), null, NOW);
    expect(result.context).toBeNull();
    expect(result.dataQuality.missing).toEqual([
      "price.change1hPct",
      "price.high24h",
      "price.range24hPositionPct",
      "market.fdvUsd",
      "market.circulatingToMaxPct",
      "context",
    ]);
  });

  it("is null, never NaN or Infinity, when a denominator is zero", () => {
    const result = buildAnalysisInput(
      { ...DETAIL, marketCapUsd: 0, atlUsd: 0 },
      dailySeries(HISTORY_DAYS),
      GLOBAL,
      NOW,
    );
    expect(result.market.volumeToMarketCapPct).toBeNull();
    expect(result.history.fromAtlPct).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
  });

  it("rejects dates out of order, duplicates and non-finite numbers", () => {
    const series = dailySeries(10);
    expect(() => buildAnalysisInput(DETAIL, [...series].reverse(), GLOBAL, NOW)).toThrow();
    const duplicate = [...series, { ...series[9], date: isoDay(0), closeUsd: 1, volumeUsd: 1 }];
    expect(() => buildAnalysisInput(DETAIL, duplicate, GLOBAL, NOW)).toThrow();
    expect(() =>
      buildAnalysisInput({ ...DETAIL, priceUsd: Number.NaN }, series, GLOBAL, NOW),
    ).toThrow();
    const nanClose = series.map((point, i) =>
      i === 3 ? { ...point, closeUsd: Number.NaN } : point,
    );
    expect(() => buildAnalysisInput(DETAIL, nanClose, GLOBAL, NOW)).toThrow();
    expect(() => buildAnalysisInput(DETAIL, series, GLOBAL, new Date("nope"))).toThrow();
  });
});

describe("classifyTrend", () => {
  it("uses a ±0.5% dead band around sma50", () => {
    expect(classifyTrend(100.6, 100)).toBe("up");
    expect(classifyTrend(100.5, 100)).toBe("flat");
    expect(classifyTrend(99.5, 100)).toBe("flat");
    expect(classifyTrend(99.4, 100)).toBe("down");
  });

  it("is null when either average is unknown", () => {
    expect(classifyTrend(null, 100)).toBeNull();
    expect(classifyTrend(100, null)).toBeNull();
    expect(classifyTrend(100, 0)).toBeNull();
  });
});
