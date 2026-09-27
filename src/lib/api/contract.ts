// Shared by the route handlers and (from Step 9) client code, so no "server-only" here.
import * as z from "zod";

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
