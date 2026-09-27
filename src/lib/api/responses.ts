import "server-only";

import { isMarketDataError, type MarketDataErrorCode } from "@/lib/domain/errors";
import type { MarketResult } from "@/lib/domain/market";

import { errorCacheControl, successCacheControl } from "./cache-headers";
import type { ApiError, ApiErrorCode, ApiSuccess } from "./contract";
import { ApiInputError } from "./params";

type ErrorMapping = { status: number; code: ApiErrorCode; message: string };

/** Seconds a client should wait after RATE_LIMITED. */
export const RATE_LIMITED_RETRY_AFTER_SECONDS = 30;

// Fixed public messages: provider messages never reach the client, whatever they say.
const MARKET_ERRORS: Record<MarketDataErrorCode, ErrorMapping> = {
  NOT_FOUND: { status: 404, code: "NOT_FOUND", message: "Coin not found" },
  RATE_LIMITED: {
    status: 503,
    code: "RATE_LIMITED",
    message: "Market data is busy, please try again later",
  },
  UPSTREAM: { status: 502, code: "UPSTREAM_ERROR", message: "Market data is unavailable" },
  INVALID_RESPONSE: { status: 502, code: "UPSTREAM_ERROR", message: "Market data is unavailable" },
  CONFIG: { status: 500, code: "CONFIG_ERROR", message: "Market data is not configured" },
};

const INTERNAL: ErrorMapping = { status: 500, code: "INTERNAL", message: "Internal server error" };

/** 200 with the success envelope and CDN cache headers. */
export function ok<T>({ data, source, fetchedAt, stale }: MarketResult<T>, ttlSeconds: number) {
  const body: ApiSuccess<T> = { data, meta: { source, fetchedAt, stale } };
  return Response.json(body, { headers: { "Cache-Control": successCacheControl(ttlSeconds) } });
}

function mapError(error: unknown): ErrorMapping {
  if (error instanceof ApiInputError) {
    return { status: 400, code: "INVALID_INPUT", message: error.message };
  }
  if (isMarketDataError(error)) return MARKET_ERRORS[error.code];
  return INTERNAL;
}

/**
 * The error envelope for any thrown value. Only status, code and a safe message leave the
 * server: never a stack, cause, upstream URL or body. Server-side failures are logged by name
 * and message only (MarketDataError messages are secret-free by contract).
 */
export function fail(error: unknown): Response {
  const { status, code, message } = mapError(error);
  if (status >= 500) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
    console.error(`[api] ${code}: ${detail}`);
  }
  const headers: Record<string, string> = { "Cache-Control": errorCacheControl(status) };
  if (code === "RATE_LIMITED") headers["Retry-After"] = String(RATE_LIMITED_RETRY_AFTER_SECONDS);
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status, headers });
}
