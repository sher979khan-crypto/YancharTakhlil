// Test-only analysis results that satisfy AnalysisResultSchema (client-side tests: no server code).
import type { AnalysisResult } from "../contract";

const data = { source: "coingecko", fetchedAt: "2026-09-27T11:58:00.000Z", stale: false } as const;

/** A BUY answer from a model, with free text. */
export const AI_RESULT: AnalysisResult = {
  kind: "ai",
  model: "qwen/qwen3.8-27b:free",
  promptVersion: "analyst-v2",
  signal: "BUY",
  confidence: "medium",
  summary:
    "Based on the data, the analysis recommends buying. The trend is up and the price is +1.55% above the 50-day average.",
  reasons: [
    {
      metric: "indicators.trend",
      stance: "bullish",
      text: "The 20-day average is above the 50-day average.",
      templateKey: null,
      value: "up",
    },
    {
      metric: "indicators.volumeTrend7dPct",
      stance: "bullish",
      text: "Volume over the last 7 days is +8.26% versus the prior period.",
      templateKey: null,
      value: "+8.26%",
    },
    {
      metric: "price.change7dPct",
      stance: "bearish",
      text: "The price moved -2.35% over 7 days.",
      templateKey: null,
      value: "-2.35%",
    },
  ],
  risks: ["The price is still -22.87% from its all-time high."],
  invalidation: {
    metric: "indicators.sma50",
    text: "A move below $95,762.90 would weaken this view.",
    templateKey: null,
    value: "$95,762.90",
  },
  generatedAt: "2026-09-27T12:00:00.000Z",
  data,
};

/** The rule-based fallback: template keys instead of text, no summary or risks. */
export const BASIC_RESULT: AnalysisResult = {
  kind: "basic",
  model: null,
  promptVersion: "basic-v1",
  signal: "HOLD",
  confidence: "low",
  summary: null,
  reasons: [
    {
      metric: "indicators.trend",
      stance: "bullish",
      text: null,
      templateKey: "trendUp",
      value: "up",
    },
    {
      metric: "indicators.rsi14",
      stance: "bullish",
      text: null,
      templateKey: "rsiStrong",
      value: "51.68",
    },
    {
      metric: "price.change7dPct",
      stance: "bearish",
      text: null,
      templateKey: "change7dDown",
      value: "-2.35%",
    },
  ],
  risks: [],
  invalidation: {
    metric: "indicators.sma20",
    text: null,
    templateKey: "invalidationBelow",
    value: "$96,279.80",
  },
  generatedAt: "2026-09-27T12:00:00.000Z",
  data: { ...data, source: "fixture" },
};
