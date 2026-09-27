// Browser-side client for GET /api/v1/coins. Imports only the shared contract, never server code.
import type { Coin, MarketResult } from "@/lib/domain/market";

import { CoinsResponseSchema } from "./contract";

export const COINS_ENDPOINT = "/api/v1/coins";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Fetches and validates the top list. Throws on a network error, a non-2xx status or a body that
 * breaks the contract, so the caller can keep its last good data. An abort rethrows AbortError.
 */
export async function fetchCoins(
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<MarketResult<Coin[]>> {
  const response = await fetchImpl(COINS_ENDPOINT, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`GET ${COINS_ENDPOINT} failed with ${response.status}`);
  const parsed = CoinsResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`GET ${COINS_ENDPOINT} returned an invalid body`);
  return { ...parsed.data.meta, data: parsed.data.data };
}

/** Milliseconds until the next poll is due: 0 when it is overdue. */
export function nextPollDelay(lastAttemptMs: number, nowMs: number, intervalMs: number): number {
  return Math.max(0, intervalMs - (nowMs - lastAttemptMs));
}
