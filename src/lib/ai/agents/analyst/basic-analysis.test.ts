import { beforeAll, describe, expect, it } from "vitest";

import type { AnalysisInput, Trend } from "@/lib/ai/analyst/analysis-input";

import { bitcoinInput } from "./__fixtures__/analyst-fixtures";
import { buildBasicAnalysis } from "./basic-analysis";

let base: AnalysisInput;

beforeAll(async () => {
  base = await bitcoinInput();
});

function withValues(trend: Trend | null, rsi14: number | null, change7dPct: number | null) {
  return {
    ...base,
    price: { ...base.price, change7dPct },
    indicators: { ...base.indicators, trend, rsi14 },
  };
}

describe("buildBasicAnalysis", () => {
  it("gives BUY for an up trend with strong momentum and a rising week", () => {
    const result = buildBasicAnalysis(withValues("up", 60, 5));
    expect(result).toMatchObject({ signal: "BUY", confidence: "low" });
    expect(result.reasons).toEqual([
      { metric: "indicators.trend", stance: "bullish", templateKey: "trendUp" },
      { metric: "indicators.rsi14", stance: "bullish", templateKey: "rsiStrong" },
      { metric: "price.change7dPct", stance: "bullish", templateKey: "change7dUp" },
    ]);
    // Nearest level below $97,250: sma20 $96,279.80.
    expect(result.invalidation).toEqual({
      metric: "indicators.sma20",
      templateKey: "invalidationBelow",
    });
  });

  it("gives SELL for a down trend with weak momentum and a falling week", () => {
    const result = buildBasicAnalysis(withValues("down", 40, -5));
    expect(result.signal).toBe("SELL");
    expect(result.reasons.map((reason) => reason.templateKey)).toEqual([
      "trendDown",
      "rsiWeak",
      "change7dDown",
    ]);
    // Nearest level above $97,250: high24h $98,323.60.
    expect(result.invalidation).toEqual({
      metric: "price.high24h",
      templateKey: "invalidationAbove",
    });
  });

  it.each([
    ["overbought in an up trend", withValuesLater("up", 75, 5)],
    ["an up trend with only one net bullish reason", withValuesLater("up", 60, -5)],
    ["a flat trend with bullish momentum", withValuesLater("flat", 60, 5)],
    ["oversold in a down trend", withValuesLater("down", 25, 0)],
    ["no trend", withValuesLater(null, 60, 5)],
  ])("gives HOLD for %s", (_label, make) => {
    const result = buildBasicAnalysis(make());
    expect(result.signal).toBe("HOLD");
  });

  it("gives HOLD with the nearest level on either side", () => {
    const result = buildBasicAnalysis(withValues("flat", 55, 0));
    expect(result.signal).toBe("HOLD");
    // high24h is $1,073.60 away, sma20 $970.20: sma20 is nearer.
    expect(result.invalidation?.metric).toBe("indicators.sma20");
  });

  it("skips unknown metrics and still answers HOLD with no data", () => {
    const empty = withValues(null, null, null);
    const result = buildBasicAnalysis(empty);
    expect(result).toMatchObject({ signal: "HOLD", confidence: "low", reasons: [] });
  });

  it("has no invalidation when no level is known", () => {
    const noLevels: AnalysisInput = {
      ...withValues("up", 60, 5),
      price: { ...base.price, change7dPct: 5, low24h: null, high24h: null },
    };
    noLevels.indicators = {
      ...noLevels.indicators,
      sma20: null,
      sma50: null,
      low30d: null,
      high30d: null,
      low90d: null,
      high90d: null,
    };
    expect(buildBasicAnalysis(noLevels)).toMatchObject({ signal: "BUY", invalidation: null });
  });

  it("classifies the RSI and 7-day bands at their edges", () => {
    const templates = (rsi: number, change: number) =>
      buildBasicAnalysis(withValues("flat", rsi, change)).reasons.map((r) => r.templateKey);
    expect(templates(70, 2)).toEqual(["trendFlat", "rsiStrong", "change7dFlat"]);
    expect(templates(70.01, -2)).toEqual(["trendFlat", "rsiOverbought", "change7dFlat"]);
    expect(templates(50, 2.01)).toEqual(["trendFlat", "rsiStrong", "change7dUp"]);
    expect(templates(30, -2.01)).toEqual(["trendFlat", "rsiWeak", "change7dDown"]);
    expect(templates(29.99, 0)).toEqual(["trendFlat", "rsiOversold", "change7dFlat"]);
  });
});

// it.each rows are built before beforeAll runs, so they carry a factory instead of an input.
function withValuesLater(trend: Trend | null, rsi14: number | null, change7dPct: number | null) {
  return () => withValues(trend, rsi14, change7dPct);
}
