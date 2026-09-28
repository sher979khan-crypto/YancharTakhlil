// Browser-side client for GET /api/v1/analyze. Imports only the shared contract, never server code.
import type { Locale } from "@/lib/i18n/config";

import { ApiErrorSchema, AnalyzeResponseSchema, type AnalysisResult } from "./contract";
import type { FetchLike } from "./fetch-coins";

export const ANALYZE_ENDPOINT = "/api/v1/analyze";

/** Used when a 429 carries no usable Retry-After (the per-IP minute window). */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

export function analyzeEndpoint(id: string, locale: Locale): string {
  const query = new URLSearchParams({ id, locale });
  return `${ANALYZE_ENDPOINT}?${query.toString()}`;
}

/**
 * "busy": this client asked for too many analyses (429 AI_BUSY), retry after retryAfterSeconds.
 * "not_found": the coin is not in the top list. "unavailable": anything else (network, 5xx, a
 * body that breaks the contract).
 */
export type AnalysisErrorKind = "busy" | "not_found" | "unavailable";

export class AnalysisRequestError extends Error {
  readonly kind: AnalysisErrorKind;
  /** Seconds until a retry can succeed; set only for "busy". */
  readonly retryAfterSeconds: number | null;

  constructor(kind: AnalysisErrorKind, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "AnalysisRequestError";
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Retry-After in seconds (the API only sends the delta form), else the default. */
export function parseRetryAfter(header: string | null): number {
  const seconds = header === null ? Number.NaN : Number(header.trim());
  return Number.isInteger(seconds) && seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * One analysis of `id` in `locale`. The browser HTTP cache is left on (unlike the price
 * fetchers): an analysis is the same for 15 minutes, and the CDN caches it too. Throws
 * AnalysisRequestError for every failure; an abort rethrows AbortError.
 */
export async function fetchAnalysis(
  id: string,
  locale: Locale,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<AnalysisResult> {
  const endpoint = analyzeEndpoint(id, locale);
  let response: Response;
  try {
    response = await fetchImpl(endpoint, { signal, headers: { accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AnalysisRequestError("unavailable", `GET ${endpoint} failed`);
  }

  if (!response.ok) {
    const code = ApiErrorSchema.safeParse(await readJson(response)).data?.error.code;
    if (response.status === 429 || code === "AI_BUSY") {
      throw new AnalysisRequestError(
        "busy",
        `GET ${endpoint} is rate limited`,
        parseRetryAfter(response.headers.get("retry-after")),
      );
    }
    const kind = response.status === 404 || code === "NOT_FOUND" ? "not_found" : "unavailable";
    throw new AnalysisRequestError(kind, `GET ${endpoint} failed with ${response.status}`);
  }

  const parsed = AnalyzeResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new AnalysisRequestError("unavailable", `GET ${endpoint} returned an invalid body`);
  }
  return parsed.data.data;
}
