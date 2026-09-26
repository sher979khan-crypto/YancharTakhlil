import "server-only";

import { MarketDataError } from "@/lib/domain/errors";

import {
  COINGECKO_DEFAULT_RETRY_AFTER_MS,
  COINGECKO_MAX_RETRY_AFTER_MS,
  COINGECKO_PLANS,
  COINGECKO_SERVER_ERROR_RETRY_MS,
  COINGECKO_TIMEOUT_MS,
  type CoinGeckoPlan,
} from "./config";

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

export type CoinGeckoHttpConfig = {
  apiKey: string;
  plan: CoinGeckoPlan;
  /** Defaults to the global fetch, which Next.js extends with its data cache. */
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  /** Clock for the call timings and the response time fallback. */
  now?: () => number;
};

export type CoinGeckoRequestOptions = {
  /** Seconds the Next.js data cache may serve the response (a value from cacheTtl). */
  ttl: number;
  tags?: string[];
};

export type CoinGeckoResponse = {
  body: unknown;
  /** When upstream produced the response: its Date header, or now when that is missing. */
  receivedAt: string;
};

export type CoinGeckoFetch = (
  path: string,
  params: Readonly<Record<string, string>>,
  options: CoinGeckoRequestOptions,
) => Promise<CoinGeckoResponse>;

let upstreamCalls = 0;

/**
 * Fetch calls this server process has sent through the adapter, retries included. Next.js
 * data-cache hits are counted too (they cost no quota), so this is an upper bound.
 */
export function getCoinGeckoCallCount(): number {
  return upstreamCalls;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retry-After in seconds (the only form CoinGecko sends), capped; a default when unusable. */
export function retryAfterMs(header: string | null): number {
  const seconds = header === null ? Number.NaN : Number(header.trim());
  if (!Number.isFinite(seconds) || seconds < 0) return COINGECKO_DEFAULT_RETRY_AFTER_MS;
  return Math.min(seconds * 1000, COINGECKO_MAX_RETRY_AFTER_MS);
}

type Attempt = { kind: "response"; response: Response } | { kind: "timeout" } | { kind: "network" };

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function errorForStatus(status: number): MarketDataError {
  if (status === 429) return new MarketDataError("RATE_LIMITED", "CoinGecko rate limit reached");
  if (status === 404) return new MarketDataError("NOT_FOUND", "CoinGecko resource not found");
  // The status code is safe to expose; the upstream body is not.
  return new MarketDataError("UPSTREAM", `CoinGecko request failed with status ${status}`);
}

/**
 * Creates coingeckoFetch(path, params, { ttl, tags }) for one key and plan.
 * - The key travels only in the plan's header; URLs, logs and errors never contain it.
 * - Every attempt has an 8 s timeout. A timeout is not retried: a second 8 s wait would hold the
 *   page for over 16 s, and the stale cache can answer instead.
 * - At most one retry per call: 429 after Retry-After (capped at 3 s), 5xx and network errors
 *   after 500 ms. Other 4xx fail at once (404 → NOT_FOUND).
 * - Responses go through the Next.js data cache via `next.revalidate`; only 200s are stored.
 */
export function createCoinGeckoFetch({
  apiKey,
  plan,
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = COINGECKO_TIMEOUT_MS,
  sleep = defaultSleep,
  log = (line) => console.info(line),
  now = Date.now,
}: CoinGeckoHttpConfig): CoinGeckoFetch {
  const { baseUrl, keyHeader } = COINGECKO_PLANS[plan];

  async function attempt(path: string, url: string, init: RequestInit): Promise<Attempt> {
    upstreamCalls += 1;
    const started = now();
    let outcome: Attempt;
    try {
      // A fresh signal per attempt, so the retry gets its own full timeout.
      outcome = {
        kind: "response",
        response: await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
      };
    } catch (error) {
      outcome = isTimeout(error) ? { kind: "timeout" } : { kind: "network" };
    }
    const status = outcome.kind === "response" ? outcome.response.status : outcome.kind;
    // The path only: the query string is ours, but logs stay minimal on principle.
    log(`[coingecko] GET ${path} ${status} ${Math.round(now() - started)}ms`);
    return outcome;
  }

  return async function coingeckoFetch(path, params, { ttl, tags }) {
    const query = new URLSearchParams(params).toString();
    const url = `${baseUrl}${path}${query ? `?${query}` : ""}`;
    const init: RequestInit = {
      method: "GET",
      headers: { accept: "application/json", [keyHeader]: apiKey },
      next: { revalidate: ttl, ...(tags ? { tags } : {}) },
    };

    let result = await attempt(path, url, init);
    if (result.kind === "response" && result.response.status === 429) {
      await sleep(retryAfterMs(result.response.headers.get("retry-after")));
      result = await attempt(path, url, init);
    } else if (
      result.kind === "network" ||
      (result.kind === "response" && result.response.status >= 500)
    ) {
      await sleep(COINGECKO_SERVER_ERROR_RETRY_MS);
      result = await attempt(path, url, init);
    }

    if (result.kind === "timeout") {
      throw new MarketDataError("UPSTREAM", "CoinGecko request timed out");
    }
    if (result.kind === "network") {
      throw new MarketDataError("UPSTREAM", "CoinGecko could not be reached");
    }
    const { response } = result;
    if (!response.ok) throw errorForStatus(response.status);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new MarketDataError("INVALID_RESPONSE", "CoinGecko sent a response that is not JSON");
    }
    const date = response.headers.get("date");
    const upstreamTime = date === null ? null : Date.parse(date);
    const receivedAt =
      upstreamTime !== null && Number.isFinite(upstreamTime) && upstreamTime <= now()
        ? upstreamTime
        : now();
    return { body, receivedAt: new Date(receivedAt).toISOString() };
  };
}
