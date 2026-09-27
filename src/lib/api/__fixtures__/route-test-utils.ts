// Test-only helpers for the /api/v1 route handler tests.
import { MarketDataError, type MarketDataErrorCode } from "@/lib/domain/errors";
import type { MarketDataProvider } from "@/lib/providers/market-data-provider";

/** A provider whose every method throws the given error. */
export function createThrowingProvider(error: unknown): MarketDataProvider {
  const reject = async (): Promise<never> => {
    throw error;
  };
  return {
    getTopCoins: reject,
    getCoinDetail: reject,
    getDailyPrices: reject,
    getGlobalMarket: reject,
  };
}

/** Every provider error code with the status and API code it must map to. */
export const PROVIDER_ERROR_CASES: [MarketDataErrorCode | "unknown", number, string][] = [
  ["NOT_FOUND", 404, "NOT_FOUND"],
  ["RATE_LIMITED", 503, "RATE_LIMITED"],
  ["UPSTREAM", 502, "UPSTREAM_ERROR"],
  ["INVALID_RESPONSE", 502, "UPSTREAM_ERROR"],
  ["CONFIG", 500, "CONFIG_ERROR"],
  ["unknown", 500, "INTERNAL"],
];

export function providerError(code: MarketDataErrorCode | "unknown"): Error {
  return code === "unknown" ? new Error("bug") : new MarketDataError(code, "provider detail");
}

export function apiRequest(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

export function context<T>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

export const EXPECTED_ERROR_CACHE: Record<number, string> = {
  400: "no-store",
  404: "public, s-maxage=60",
  500: "no-store",
  502: "no-store",
  503: "no-store",
};
