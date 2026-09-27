// Shared by the route handlers and (from Step 9) client code, so no "server-only" here.
import * as z from "zod";

import { LEVEL_KEYS, METRIC_KEYS } from "@/lib/ai/agents/analyst/metrics";
import {
  CoinDetailSchema,
  CoinSchema,
  DailyPriceSchema,
  GlobalMarketSchema,
  MarketResultMetaSchema,
} from "@/lib/domain/market";

/** Where the data came from and how fresh it is. source "fixture" requires the demo-data banner. */
export const ApiMetaSchema = MarketResultMetaSchema;
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: ApiMetaSchema });
}
export type ApiSuccess<T> = { data: T; meta: ApiMeta };

export const API_ERROR_CODES = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "CONFIG_ERROR",
  /** 429 + Retry-After: this client asked for too many uncached analyses. */
  "AI_BUSY",
  "INTERNAL",
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({ code: ApiErrorCodeSchema, message: z.string().min(1) }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** GET /api/v1/coins */
export const CoinsResponseSchema = apiSuccessSchema(z.array(CoinSchema));
/** GET /api/v1/coins/{id} */
export const CoinDetailResponseSchema = apiSuccessSchema(CoinDetailSchema);
/** GET /api/v1/coins/{id}/chart?range=7|30|90 */
export const CoinChartResponseSchema = apiSuccessSchema(z.array(DailyPriceSchema));
/** GET /api/v1/global */
export const GlobalMarketResponseSchema = apiSuccessSchema(GlobalMarketSchema);

export const SignalSchema = z.enum(["BUY", "HOLD", "SELL"]);
export type Signal = z.infer<typeof SignalSchema>;
export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;
export const StanceSchema = z.enum(["bullish", "bearish", "neutral"]);
export type Stance = z.infer<typeof StanceSchema>;
export const MetricKeySchema = z.enum(METRIC_KEYS);
export const LevelKeySchema = z.enum(LEVEL_KEYS);

/**
 * Text keys of the rule-based ("basic") analysis, localized by the UI (Step 13). The basic
 * analysis never carries free text.
 */
export const BASIC_TEMPLATE_KEYS = [
  "trendUp",
  "trendDown",
  "trendFlat",
  "rsiOverbought",
  "rsiStrong",
  "rsiWeak",
  "rsiOversold",
  "change7dUp",
  "change7dDown",
  "change7dFlat",
  "invalidationBelow",
  "invalidationAbove",
] as const;
export const BasicTemplateKeySchema = z.enum(BASIC_TEMPLATE_KEYS);
export type BasicTemplateKey = z.infer<typeof BasicTemplateKeySchema>;

/**
 * One analysis. kind "ai": text from the model, every number in it checked by the server.
 * kind "basic": rule-based fallback with template keys instead of text. `value` is always the
 * server-formatted value of `metric`, so the UI shows exact numbers next to any text.
 */
export const AnalysisResultSchema = z.object({
  kind: z.enum(["ai", "basic"]),
  /** The model that answered; null for "basic". */
  model: z.string().min(1).nullable(),
  promptVersion: z.string().min(1),
  signal: SignalSchema,
  confidence: ConfidenceSchema,
  summary: z.string().min(1).nullable(),
  reasons: z.array(
    z.object({
      metric: MetricKeySchema,
      stance: StanceSchema,
      text: z.string().min(1).nullable(),
      templateKey: BasicTemplateKeySchema.nullable(),
      value: z.string().min(1),
    }),
  ),
  risks: z.array(z.string().min(1)),
  /** Null only for a basic analysis of a coin without any known price level. */
  invalidation: z
    .object({
      metric: LevelKeySchema,
      text: z.string().min(1).nullable(),
      templateKey: BasicTemplateKeySchema.nullable(),
      value: z.string().min(1),
    })
    .nullable(),
  generatedAt: z.iso.datetime(),
  /** The market data the analysis is based on. source "fixture" requires the demo-data banner. */
  data: MarketResultMetaSchema,
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/** GET /api/v1/analyze?id=<coin id>&locale=<en|ar|uz> */
export const AnalyzeResponseSchema = apiSuccessSchema(AnalysisResultSchema);
