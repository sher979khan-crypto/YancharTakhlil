// No "server-only": the result contract (src/lib/api/contract.ts) and the Step 13 UI use these keys.
import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";

/** Dot paths into AnalysisInput that the Analyst may cite as a reason. */
export const METRIC_KEYS = [
  "indicators.trend",
  "indicators.rsi14",
  "indicators.priceVsSma20Pct",
  "indicators.priceVsSma50Pct",
  "indicators.volatility30dPct",
  "indicators.fromLow30dPct",
  "indicators.fromHigh30dPct",
  "indicators.volumeTrend7dPct",
  "price.change24hPct",
  "price.change7dPct",
  "price.change30dPct",
  "price.range24hPositionPct",
  "market.volumeToMarketCapPct",
  "market.circulatingToMaxPct",
  "history.fromAthPct",
  "context.btcDominancePct",
  "context.marketCapChange24hPct",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** Price levels only: the invalidation must be one of these. */
export const LEVEL_KEYS = [
  "indicators.sma20",
  "indicators.sma50",
  "indicators.low30d",
  "indicators.high30d",
  "indicators.low90d",
  "indicators.high90d",
  "price.low24h",
  "price.high24h",
] as const;
export type LevelKey = (typeof LEVEL_KEYS)[number];

/**
 * Also pre-formatted for the model, though not citable as a reason or level: the current price
 * (the invalidation side is judged against it) and the absolute sizes behind the ratios.
 */
export const CONTEXT_DISPLAY_KEYS = [
  "price.usd",
  "history.athUsd",
  "market.marketCapUsd",
  "market.volume24hUsd",
] as const;

export const DISPLAY_KEYS = [...METRIC_KEYS, ...LEVEL_KEYS, ...CONTEXT_DISPLAY_KEYS] as const;
export type DisplayKey = (typeof DISPLAY_KEYS)[number];

/** How a value is shown (src/lib/i18n/format.ts). */
export type DisplayFormat = "price" | "change" | "share" | "largeUsd" | "score" | "trend";

export const DISPLAY_FORMATS: Readonly<Record<DisplayKey, DisplayFormat>> = {
  "indicators.trend": "trend",
  "indicators.rsi14": "score",
  "indicators.priceVsSma20Pct": "change",
  "indicators.priceVsSma50Pct": "change",
  "indicators.volatility30dPct": "share",
  "indicators.fromLow30dPct": "change",
  "indicators.fromHigh30dPct": "change",
  "indicators.volumeTrend7dPct": "change",
  "price.change24hPct": "change",
  "price.change7dPct": "change",
  "price.change30dPct": "change",
  "price.range24hPositionPct": "share",
  "market.volumeToMarketCapPct": "share",
  "market.circulatingToMaxPct": "share",
  "history.fromAthPct": "change",
  "context.btcDominancePct": "share",
  "context.marketCapChange24hPct": "change",
  "indicators.sma20": "price",
  "indicators.sma50": "price",
  "indicators.low30d": "price",
  "indicators.high30d": "price",
  "indicators.low90d": "price",
  "indicators.high90d": "price",
  "price.low24h": "price",
  "price.high24h": "price",
  "price.usd": "price",
  "history.athUsd": "price",
  "market.marketCapUsd": "largeUsd",
  "market.volume24hUsd": "largeUsd",
};

export type MetricValue = number | string | null;

/** The value at a dot path, or null when it (or its parent, e.g. `context`) is null. */
export function readMetric(input: AnalysisInput, key: DisplayKey): MetricValue {
  let node: unknown = input;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "number" || typeof node === "string" ? node : null;
}

/** A price level as a number, or null when unknown. */
export function readLevel(input: AnalysisInput, key: LevelKey): number | null {
  const value = readMetric(input, key);
  return typeof value === "number" ? value : null;
}

/** The metric keys the model may use for this input: those with a known value. */
export function availableMetrics(input: AnalysisInput): MetricKey[] {
  return METRIC_KEYS.filter((key) => readMetric(input, key) !== null);
}

/** The level keys the model may use for this input: those with a known value. */
export function availableLevels(input: AnalysisInput): LevelKey[] {
  return LEVEL_KEYS.filter((key) => readLevel(input, key) !== null);
}
