// Browser-side clients for GET /api/v1/coins*. Import only the shared contract, never server code.
import type * as z from "zod";

import type { ChartRange, Coin, CoinDetail, DailyPrice, MarketResult } from "@/lib/domain/market";

import {
  CoinChartResponseSchema,
  CoinDetailResponseSchema,
  CoinsResponseSchema,
  type ApiMeta,
} from "./contract";

export const COINS_ENDPOINT = "/api/v1/coins";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function coinDetailEndpoint(id: string): string {
  return `${COINS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export function coinChartEndpoint(id: string, range: ChartRange): string {
  return `${coinDetailEndpoint(id)}/chart?range=${range}`;
}

/**
 * GETs an /api/v1 endpoint and validates the success body. Throws on a network error, a non-2xx
 * status or a body that breaks the contract, so the caller can keep its last good data. An abort
 * rethrows AbortError.
 */
async function fetchResult<T>(
  endpoint: string,
  schema: z.ZodType<{ data: T; meta: ApiMeta }>,
  signal: AbortSignal | undefined,
  fetchImpl: FetchLike,
): Promise<MarketResult<T>> {
  const response = await fetchImpl(endpoint, {
    signal,
    // The API sends CDN cache headers (s-maxage); without no-store the browser HTTP cache could
    // answer a poll with the same body again, so polling would never see fresh data.
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`GET ${endpoint} failed with ${response.status}`);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`GET ${endpoint} returned an invalid body`);
  return { ...parsed.data.meta, data: parsed.data.data };
}

/** The top list. */
export function fetchCoins(
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<MarketResult<Coin[]>> {
  return fetchResult(COINS_ENDPOINT, CoinsResponseSchema, signal, fetchImpl);
}

/** One coin of the top list (a 404 for any other id throws like every error status). */
export function fetchCoinDetail(
  id: string,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<MarketResult<CoinDetail>> {
  return fetchResult(coinDetailEndpoint(id), CoinDetailResponseSchema, signal, fetchImpl);
}

/** Daily closes for the chart: up to `range` points, oldest first. */
export function fetchCoinChart(
  id: string,
  range: ChartRange,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<MarketResult<DailyPrice[]>> {
  return fetchResult(coinChartEndpoint(id, range), CoinChartResponseSchema, signal, fetchImpl);
}

/** Milliseconds until the next poll is due: 0 when it is overdue. */
export function nextPollDelay(lastAttemptMs: number, nowMs: number, intervalMs: number): number {
  return Math.max(0, intervalMs - (nowMs - lastAttemptMs));
}
