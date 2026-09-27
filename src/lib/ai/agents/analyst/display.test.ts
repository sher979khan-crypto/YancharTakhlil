import { beforeAll, describe, expect, it } from "vitest";

import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";

import { bitcoinInput } from "./__fixtures__/analyst-fixtures";
import { buildDisplay } from "./display";
import { DISPLAY_KEYS } from "./metrics";

const NBSP = " ";
let input: AnalysisInput;

beforeAll(async () => {
  input = await bitcoinInput();
});

describe("buildDisplay", () => {
  it("formats every kind of value for en", () => {
    const display = buildDisplay(input, "en");
    expect(display).toMatchObject({
      "price.usd": "$97,250.00",
      "indicators.sma50": "$95,762.90",
      "price.change7dPct": "-2.35%",
      "price.change24hPct": "+1.84%",
      "context.btcDominancePct": "56.7%",
      "market.marketCapUsd": "$1.94T",
      "market.volume24hUsd": "$38.4B",
      "indicators.rsi14": "51.68",
      "indicators.trend": "up",
    });
    expect(Object.keys(display).sort()).toEqual([...DISPLAY_KEYS].sort());
  });

  it("uses the uz separators and suffixes", () => {
    expect(buildDisplay(input, "uz")).toMatchObject({
      "price.usd": `$97${NBSP}250,00`,
      "price.change7dPct": "-2,35%",
      "market.marketCapUsd": "$1,94 trln",
      "indicators.rsi14": "51,68",
      "indicators.trend": "up",
    });
  });

  it("uses Latin digits and Arabic compact words for ar", () => {
    const display = buildDisplay(input, "ar");
    expect(display).toMatchObject({
      "price.usd": "$97,250.00",
      "market.marketCapUsd": "$1.94 تريليون",
      "market.volume24hUsd": "$38.4 مليار",
    });
    for (const value of Object.values(display)) expect(value).not.toMatch(/[٠-٩]/);
  });

  it("leaves out unknown values, including a null context", () => {
    const partial: AnalysisInput = {
      ...input,
      indicators: { ...input.indicators, sma50: null, trend: null },
      context: null,
    };
    const display = buildDisplay(partial, "en");
    expect(display).not.toHaveProperty("indicators.sma50");
    expect(display).not.toHaveProperty("indicators.trend");
    expect(display).not.toHaveProperty("context.btcDominancePct");
    expect(display).toHaveProperty("indicators.sma20");
  });
});
