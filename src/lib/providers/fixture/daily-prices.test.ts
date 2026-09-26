import { describe, expect, it } from "vitest";

import { CHART_RANGES } from "@/lib/domain/market";

import { dailyVolatility, generateDailyPrices } from "./daily-prices";

const bitcoin = { id: "bitcoin", priceUsd: 97250, marketCapUsd: 1.9e12, volume24hUsd: 3.8e10 };
const micro = { id: "pepe", priceUsd: 0.00000981, marketCapUsd: 4.1e9, volume24hUsd: 7.4e8 };
const SEED_DATE = "2026-09-26";

function logReturns(closes: number[]): number[] {
  return closes.slice(1).map((close, i) => Math.log(close / (closes[i] ?? close)));
}

describe("generateDailyPrices", () => {
  it("is deterministic", () => {
    expect(generateDailyPrices(bitcoin, 90, SEED_DATE)).toEqual(
      generateDailyPrices(bitcoin, 90, SEED_DATE),
    );
  });

  it("changes with the coin and the seed date", () => {
    const base = generateDailyPrices(bitcoin, 30, SEED_DATE).map((p) => p.closeUsd);
    const otherCoin = generateDailyPrices({ ...bitcoin, id: "other" }, 30, SEED_DATE);
    const otherDate = generateDailyPrices(bitcoin, 30, "2026-09-27");
    expect(otherCoin.map((p) => p.closeUsd)).not.toEqual(base);
    expect(otherDate.map((p) => p.closeUsd)).not.toEqual(base);
  });

  it.each(CHART_RANGES)(
    "returns %i consecutive ascending days ending on the seed date",
    (range) => {
      const series = generateDailyPrices(bitcoin, range, SEED_DATE);
      expect(series).toHaveLength(range);
      expect(series.at(-1)?.date).toBe(SEED_DATE);
      for (let i = 1; i < series.length; i++) {
        const previous = Date.parse(series[i - 1]?.date ?? "");
        expect(Date.parse(series[i]?.date ?? "") - previous).toBe(86_400_000);
      }
    },
  );

  it("crosses month and year boundaries correctly", () => {
    const series = generateDailyPrices(bitcoin, 7, "2026-01-03");
    expect(series.map((p) => p.date)).toEqual([
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("ends exactly at the current price and 24h volume", () => {
    for (const coin of [bitcoin, micro]) {
      const last = generateDailyPrices(coin, 30, SEED_DATE).at(-1);
      expect(last?.closeUsd).toBe(coin.priceUsd);
      expect(last?.volumeUsd).toBe(Math.round(coin.volume24hUsd));
    }
  });

  it("makes shorter ranges the tail of longer ones", () => {
    const long = generateDailyPrices(bitcoin, 90, SEED_DATE);
    expect(generateDailyPrices(bitcoin, 30, SEED_DATE)).toEqual(long.slice(-30));
    expect(generateDailyPrices(bitcoin, 7, SEED_DATE)).toEqual(long.slice(-7));
  });

  it("keeps every value positive, including sub-cent prices", () => {
    for (const coin of [bitcoin, micro]) {
      for (const point of generateDailyPrices(coin, 90, SEED_DATE)) {
        expect(point.closeUsd).toBeGreaterThan(0);
        expect(point.volumeUsd).toBeGreaterThan(0);
        expect(Number.isFinite(point.closeUsd)).toBe(true);
      }
    }
  });

  it("keeps daily moves within four standard deviations", () => {
    for (const coin of [bitcoin, micro]) {
      const limit = 4 * dailyVolatility(coin.marketCapUsd) + 1e-6;
      const closes = generateDailyPrices(coin, 90, SEED_DATE).map((p) => p.closeUsd);
      for (const move of logReturns(closes)) expect(Math.abs(move)).toBeLessThanOrEqual(limit);
    }
  });

  it("moves smaller caps more than larger ones", () => {
    // Same id, so the same random draws: only the market cap differs.
    const big = generateDailyPrices(bitcoin, 90, SEED_DATE).map((p) => p.closeUsd);
    const small = generateDailyPrices({ ...bitcoin, marketCapUsd: 1e8 }, 90, SEED_DATE).map(
      (p) => p.closeUsd,
    );
    const size = (moves: number[]) => moves.reduce((sum, move) => sum + Math.abs(move), 0);
    expect(size(logReturns(small))).toBeGreaterThan(size(logReturns(big)) * 2);
  });

  it("rejects a malformed seed date", () => {
    expect(() => generateDailyPrices(bitcoin, 7, "2026-9-26")).toThrow(RangeError);
    expect(() => generateDailyPrices(bitcoin, 7, "2026-02-30")).toThrow(RangeError);
  });
});

describe("dailyVolatility", () => {
  it("grows as market cap shrinks, within 2%..8%", () => {
    expect(dailyVolatility(2e12)).toBe(0.02);
    expect(dailyVolatility(1e10)).toBeCloseTo(0.04);
    expect(dailyVolatility(1e3)).toBe(0.08);
    expect(dailyVolatility(0)).toBe(0.08);
  });
});
