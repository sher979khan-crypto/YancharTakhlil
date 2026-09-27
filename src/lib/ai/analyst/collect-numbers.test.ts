import { describe, expect, it } from "vitest";

import type { AnalysisInput } from "./analysis-input";
import { collectNumbers } from "./collect-numbers";

const INPUT: AnalysisInput = {
  version: 1,
  asOf: "2026-09-27T12:00:00.000Z",
  coin: { id: "pepe", name: "Pepe", symbol: "PEPE", rank: 13 },
  price: {
    usd: 0.00000981235,
    change1hPct: -0.12,
    change24hPct: 5.4,
    change7dPct: null,
    change30dPct: -20.5,
    high24h: 0.0000101,
    low24h: 0.00000932,
    range24hPositionPct: 62.5,
  },
  market: {
    marketCapUsd: 4_130_000_000,
    volume24hUsd: 812_000_000,
    volumeToMarketCapPct: 19.66,
    fdvUsd: 4_130_000_000,
    circulatingToMaxPct: null,
  },
  history: {
    athUsd: 0.0000282,
    fromAthPct: -65.2,
    atlUsd: 5.5e-8,
    fromAtlPct: 17740.6,
    dailyPoints: 90,
  },
  indicators: {
    rsi14: 48.31,
    sma20: 0.0000102,
    sma50: 0.0000111,
    priceVsSma20Pct: -3.8,
    priceVsSma50Pct: -11.6,
    trend: "down",
    volatility30dPct: 4.87,
    low30d: 0.00000901,
    high30d: 0.0000125,
    low90d: 0.00000901,
    high90d: 0.0000144,
    fromLow30dPct: 8.9,
    fromHigh30dPct: -21.5,
    volumeTrend7dPct: -12.4,
  },
  context: { btcDominancePct: 53.99, marketCapChange24hPct: -1.23 },
  dataQuality: { limitedHistory: false, missing: ["price.change7dPct"] },
};

/** Every number in the JSON the LLM receives, found by a different route than the walker. */
function numbersInJson(input: AnalysisInput): number[] {
  const found: number[] = [];
  JSON.stringify(input, (_key, value: unknown) => {
    if (typeof value === "number") found.push(value);
    return value;
  });
  return found;
}

describe("collectNumbers", () => {
  const numbers = collectNumbers(INPUT);

  it("contains every number in the input", () => {
    const inJson = numbersInJson(INPUT);
    expect(inJson.length).toBeGreaterThan(30);
    for (const value of inJson) expect(numbers).toContain(value);
  });

  it("adds the absolute value of each negative number", () => {
    for (const value of [-0.12, -20.5, -65.2, -3.8, -11.6, -21.5, -12.4, -1.23]) {
      expect(numbers).toContain(value);
      expect(numbers).toContain(-value);
    }
  });

  it("adds nothing else, and is unique and ascending", () => {
    const expected = new Set(numbersInJson(INPUT).flatMap((n) => (n < 0 ? [n, -n] : [n])));
    expect(numbers).toEqual([...expected].sort((a, b) => a - b));
  });

  it("skips strings, booleans and nulls (dates, ids and the missing list are not numbers)", () => {
    expect(numbers).not.toContain(2026);
    expect(numbers).not.toContain(0);
  });
});
