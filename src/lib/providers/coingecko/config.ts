import "server-only";

import type { ServerEnv } from "@/lib/env/server-env";

export type CoinGeckoPlan = ServerEnv["COINGECKO_API_PLAN"];

type PlanConfig = {
  baseUrl: string;
  /** The key goes only in this header, never in the query string (it would end up in logs). */
  keyHeader: string;
};

export const COINGECKO_PLANS: Readonly<Record<CoinGeckoPlan, PlanConfig>> = {
  demo: { baseUrl: "https://api.coingecko.com/api/v3", keyHeader: "x-cg-demo-api-key" },
  pro: { baseUrl: "https://pro-api.coingecko.com/api/v3", keyHeader: "x-cg-pro-api-key" },
};

export const COINGECKO_TIMEOUT_MS = 8_000;
/** Longest wait a 429 Retry-After may impose before the single retry. */
export const COINGECKO_MAX_RETRY_AFTER_MS = 3_000;
/** Wait for a 429 without a usable Retry-After header. */
export const COINGECKO_DEFAULT_RETRY_AFTER_MS = 1_000;
export const COINGECKO_SERVER_ERROR_RETRY_MS = 500;

/**
 * One /coins/markets page feeds both the top list and every coin detail. 250 is the API maximum
 * and leaves room for the ~30 excluded coins that sit inside the top 130 or so.
 */
export const COINGECKO_MARKETS_PER_PAGE = 250;
export const COINGECKO_PRICE_CHANGE_WINDOWS = "1h,24h,7d,30d";
