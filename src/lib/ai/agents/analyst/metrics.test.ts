import { beforeAll, describe, expect, it } from "vitest";

import { AnalysisInputSchema, type AnalysisInput } from "@/lib/ai/analyst/analysis-input";

import { bitcoinInput } from "./__fixtures__/analyst-fixtures";
import {
  availableLevels,
  availableMetrics,
  DISPLAY_KEYS,
  LEVEL_KEYS,
  METRIC_KEYS,
  readLevel,
  readMetric,
} from "./metrics";

let input: AnalysisInput;

beforeAll(async () => {
  input = await bitcoinInput();
});

describe("metric keys", () => {
  it("are all real paths into AnalysisInput", () => {
    const shape = AnalysisInputSchema.shape;
    for (const key of DISPLAY_KEYS) {
      const [group = "", field = ""] = key.split(".");
      expect(Object.keys(shape), key).toContain(group);
      expect(JSON.stringify(input), key).toContain(`"${field}"`);
    }
  });

  it("keep reasons and levels apart and unique", () => {
    expect(new Set(DISPLAY_KEYS).size).toBe(DISPLAY_KEYS.length);
    for (const key of LEVEL_KEYS) expect(METRIC_KEYS).not.toContain(key);
  });
});

describe("readMetric / readLevel", () => {
  it("reads numbers and the trend word", () => {
    expect(readMetric(input, "indicators.rsi14")).toBe(51.68);
    expect(readMetric(input, "indicators.trend")).toBe("up");
    expect(readLevel(input, "indicators.sma50")).toBe(95762.9);
  });

  it("returns null for a null value or a null parent", () => {
    const partial: AnalysisInput = {
      ...input,
      indicators: { ...input.indicators, low90d: null },
      context: null,
    };
    expect(readLevel(partial, "indicators.low90d")).toBeNull();
    expect(readMetric(partial, "context.btcDominancePct")).toBeNull();
  });
});

describe("availableMetrics / availableLevels", () => {
  it("list every key for a complete input", () => {
    expect(availableMetrics(input)).toEqual([...METRIC_KEYS]);
    expect(availableLevels(input)).toEqual([...LEVEL_KEYS]);
  });

  it("drop keys whose value is null", () => {
    const partial: AnalysisInput = {
      ...input,
      indicators: { ...input.indicators, rsi14: null, sma50: null },
      context: null,
    };
    expect(availableMetrics(partial)).not.toContain("indicators.rsi14");
    expect(availableMetrics(partial)).not.toContain("context.btcDominancePct");
    expect(availableLevels(partial)).not.toContain("indicators.sma50");
  });
});
