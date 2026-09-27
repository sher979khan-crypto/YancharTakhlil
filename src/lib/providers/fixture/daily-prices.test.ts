import { describe, expect, it } from "vitest";

import { CHART_RANGES, SPARKLINE_POINTS } from "@/lib/domain/market";

import { dailyVolatility, generateDailyPrices, generateSparkline } from "./daily-prices";

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

describe("generateDailyPrices with known 7d / 30d changes", () => {
  const ratio = (a = 0, b = 1) => a / b;
  const cases = [
    { change7dPct: -7.2, change30dPct: 6.12 },
    { change7dPct: 11.2, change30dPct: -18.4 },
    { change7dPct: 0.4, change30dPct: 0.01 },
  ];

  it.each(cases)("agrees with 7d $change7dPct% and 30d $change30dPct%", (changes) => {
    for (const base of [bitcoin, micro]) {
      const coin = { ...base, ...changes };
      const long = generateDailyPrices(coin, 90, SEED_DATE);
      const month = generateDailyPrices(coin, 30, SEED_DATE);
      const week = generateDailyPrices(coin, 7, SEED_DATE);
      // end / start of each chart equals 1 + change, within 0.5%.
      expect(
        Math.abs(
          ratio(month.at(-1)?.closeUsd, month[0]?.closeUsd) / (1 + changes.change30dPct / 100) - 1,
        ),
      ).toBeLessThan(0.005);
      expect(
        Math.abs(
          ratio(week.at(-1)?.closeUsd, week[0]?.closeUsd) / (1 + changes.change7dPct / 100) - 1,
        ),
      ).toBeLessThan(0.005);
      // Still exact tails, still ending at the current price.
      expect(month).toEqual(long.slice(-30));
      expect(week).toEqual(long.slice(-7));
      expect(week.at(-1)?.closeUsd).toBe(coin.priceUsd);
    }
  });

  it("uses only the 7d anchor when the 30d change is unknown, and vice versa", () => {
    const only7 = { ...bitcoin, change7dPct: 5, change30dPct: null };
    const week = generateDailyPrices(only7, 7, SEED_DATE);
    expect(Math.abs(ratio(week.at(-1)?.closeUsd, week[0]?.closeUsd) / 1.05 - 1)).toBeLessThan(
      0.005,
    );

    const only30 = { ...bitcoin, change7dPct: null, change30dPct: -12 };
    const month = generateDailyPrices(only30, 30, SEED_DATE);
    expect(Math.abs(ratio(month.at(-1)?.closeUsd, month[0]?.closeUsd) / 0.88 - 1)).toBeLessThan(
      0.005,
    );
  });

  it("matches the untilted walk when no change is known", () => {
    const plain = generateDailyPrices(bitcoin, 90, SEED_DATE);
    const nulls = { ...bitcoin, change7dPct: null, change30dPct: null };
    expect(generateDailyPrices(nulls, 90, SEED_DATE)).toEqual(plain);
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

describe("generateSparkline", () => {
  const flat = { ...bitcoin, change7dPct: null };

  it("has 42 positive points ending exactly at the current price", () => {
    for (const coin of [flat, { ...micro, change7dPct: 12 }]) {
      const points = generateSparkline(coin, SEED_DATE);
      expect(points).toHaveLength(SPARKLINE_POINTS);
      expect(points.every((point) => point > 0)).toBe(true);
      expect(points.at(-1)).toBe(coin.priceUsd);
    }
  });

  it("is deterministic", () => {
    expect(generateSparkline(flat, SEED_DATE)).toEqual(generateSparkline(flat, SEED_DATE));
  });

  it("passes through the daily closes of the 7-day chart when there is no 7d change", () => {
    const points = generateSparkline(flat, SEED_DATE);
    const closes = generateDailyPrices(flat, 7, SEED_DATE).map((point) => point.closeUsd);
    // Every sixth point (one per day, 4-hour steps) is that day's close.
    const daily = points.filter((_, i) => (i + 1) % 6 === 0);
    expect(daily.slice(-closes.length, -1)).toEqual(closes.slice(0, -1));
  });

  it.each([-7.2, -2.35, 1.9, 11.2])("starts where a %f% 7-day change says", (change7dPct) => {
    const coin = { ...bitcoin, change7dPct };
    const points = generateSparkline(coin, SEED_DATE);
    const expectedStart = coin.priceUsd / (1 + change7dPct / 100);
    // The first point is 4 hours after the 7-day mark, so it is close to, not exactly, the start.
    expect(Math.abs(Math.log((points[0] ?? 0) / expectedStart))).toBeLessThan(0.03);
    expect(Math.sign((points.at(-1) ?? 0) - (points[0] ?? 0))).toBe(Math.sign(change7dPct));
  });

  it("is not a straight line between the closes", () => {
    const points = generateSparkline(flat, SEED_DATE);
    const [a = 0, b = 0, c = 0] = points;
    expect(b - a).not.toBeCloseTo(c - b, 6);
  });
});
