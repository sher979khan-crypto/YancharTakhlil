import "server-only";

import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import type { BasicTemplateKey, Signal, Stance } from "@/lib/api/contract";

import { LEVEL_KEYS, readLevel, type LevelKey, type MetricKey } from "./metrics";

/** Version of the rules below; sent as promptVersion for kind "basic". */
export const BASIC_RULES_VERSION = "basic-v1";

export const RSI_OVERBOUGHT = 70;
export const RSI_OVERSOLD = 30;
export const RSI_MIDLINE = 50;
/** A 7-day move within ±2% is noise for this purpose. */
export const CHANGE_7D_FLAT_PCT = 2;

export type BasicReason = { metric: MetricKey; stance: Stance; templateKey: BasicTemplateKey };

export type BasicAnalysis = {
  signal: Signal;
  confidence: "low";
  reasons: BasicReason[];
  invalidation: { metric: LevelKey; templateKey: BasicTemplateKey } | null;
};

function trendReason(trend: AnalysisInput["indicators"]["trend"]): BasicReason | null {
  if (trend === null) return null;
  const metric = "indicators.trend";
  if (trend === "up") return { metric, stance: "bullish", templateKey: "trendUp" };
  if (trend === "down") return { metric, stance: "bearish", templateKey: "trendDown" };
  return { metric, stance: "neutral", templateKey: "trendFlat" };
}

function rsiReason(rsi: number | null): BasicReason | null {
  if (rsi === null) return null;
  const metric = "indicators.rsi14";
  if (rsi > RSI_OVERBOUGHT) return { metric, stance: "bearish", templateKey: "rsiOverbought" };
  if (rsi >= RSI_MIDLINE) return { metric, stance: "bullish", templateKey: "rsiStrong" };
  if (rsi >= RSI_OVERSOLD) return { metric, stance: "bearish", templateKey: "rsiWeak" };
  // Oversold: weak, but stretched enough that it is not a reason to sell on its own.
  return { metric, stance: "neutral", templateKey: "rsiOversold" };
}

function change7dReason(change: number | null): BasicReason | null {
  if (change === null) return null;
  const metric = "price.change7dPct";
  if (change > CHANGE_7D_FLAT_PCT) return { metric, stance: "bullish", templateKey: "change7dUp" };
  if (change < -CHANGE_7D_FLAT_PCT) {
    return { metric, stance: "bearish", templateKey: "change7dDown" };
  }
  return { metric, stance: "neutral", templateKey: "change7dFlat" };
}

/**
 * The known level closest to the price on the given side (ties: first in LEVEL_KEYS), or null.
 */
function nearestLevel(input: AnalysisInput, side: "below" | "above" | "either"): LevelKey | null {
  const price = input.price.usd;
  let best: { key: LevelKey; distance: number } | null = null;
  for (const key of LEVEL_KEYS) {
    const level = readLevel(input, key);
    if (level === null) continue;
    if (side === "below" && !(level < price)) continue;
    if (side === "above" && !(level > price)) continue;
    const distance = Math.abs(price - level);
    if (!best || distance < best.distance) best = { key, distance };
  }
  return best?.key ?? null;
}

/**
 * Rule-based fallback when no model answer passes (no key, all models failed, budget spent).
 * Deterministic, and it follows the same guidance as the system prompt:
 * - Reasons (null metrics are skipped): trend up bullish / down bearish / flat neutral;
 *   RSI 14 above 70 bearish (overbought), 50-70 bullish, 30-50 bearish (weak), below 30 neutral
 *   (oversold); 7-day change above +2% bullish, below -2% bearish, otherwise neutral.
 * - Signal: BUY when the trend is up and bullish reasons outnumber bearish ones by 2 or more;
 *   SELL when the trend is down and bearish outnumber bullish by 2 or more; otherwise HOLD.
 *   Without a known trend it is always HOLD.
 * - Confidence is always "low": the rules are coarse.
 * - Invalidation, by the same side rule as the AI's: BUY the nearest level below the price,
 *   SELL the nearest above, HOLD the nearest on either side; null if no level is known.
 */
export function buildBasicAnalysis(input: AnalysisInput): BasicAnalysis {
  const reasons = [
    trendReason(input.indicators.trend),
    rsiReason(input.indicators.rsi14),
    change7dReason(input.price.change7dPct),
  ].filter((reason): reason is BasicReason => reason !== null);

  const bullish = reasons.filter((reason) => reason.stance === "bullish").length;
  const bearish = reasons.filter((reason) => reason.stance === "bearish").length;
  const trend = input.indicators.trend;
  const signal: Signal =
    trend === "up" && bullish - bearish >= 2
      ? "BUY"
      : trend === "down" && bearish - bullish >= 2
        ? "SELL"
        : "HOLD";

  const side = signal === "BUY" ? "below" : signal === "SELL" ? "above" : "either";
  const metric = nearestLevel(input, side);
  const invalidation =
    metric === null
      ? null
      : {
          metric,
          templateKey:
            (readLevel(input, metric) ?? 0) < input.price.usd
              ? ("invalidationBelow" as const)
              : ("invalidationAbove" as const),
        };

  return { signal, confidence: "low", reasons, invalidation };
}
