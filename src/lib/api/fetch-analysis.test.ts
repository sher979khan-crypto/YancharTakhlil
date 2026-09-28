import { describe, expect, it, vi } from "vitest";

import { AI_RESULT, BASIC_RESULT } from "./__fixtures__/analysis-results";
import {
  AnalysisRequestError,
  analyzeEndpoint,
  DEFAULT_RETRY_AFTER_SECONDS,
  fetchAnalysis,
  parseRetryAfter,
} from "./fetch-analysis";
import type { FetchLike } from "./fetch-coins";

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn<FetchLike>(async () => Response.json(body, { status, headers }));
}

async function failure(promise: Promise<unknown>): Promise<AnalysisRequestError> {
  const error = await promise.catch((reason: unknown) => reason);
  expect(error).toBeInstanceOf(AnalysisRequestError);
  return error as AnalysisRequestError;
}

describe("fetchAnalysis", () => {
  it("requests the coin + locale and returns the validated result", async () => {
    const fetchImpl = respond({ data: AI_RESULT, meta: AI_RESULT.data });
    await expect(fetchAnalysis("bitcoin", "uz", undefined, fetchImpl)).resolves.toEqual(AI_RESULT);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/v1/analyze?id=bitcoin&locale=uz",
      expect.anything(),
    );
  });

  it("accepts a basic result", async () => {
    const fetchImpl = respond({ data: BASIC_RESULT, meta: BASIC_RESULT.data });
    await expect(fetchAnalysis("bitcoin", "en", undefined, fetchImpl)).resolves.toEqual(
      BASIC_RESULT,
    );
  });

  it("leaves the browser HTTP cache on (analyses are cacheable, unlike price polls)", async () => {
    const fetchImpl = respond({ data: AI_RESULT, meta: AI_RESULT.data });
    const controller = new AbortController();
    await fetchAnalysis("bitcoin", "en", controller.signal, fetchImpl);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.cache).toBeUndefined();
    expect(init?.signal).toBe(controller.signal);
  });

  it("reports AI_BUSY as busy with the Retry-After seconds", async () => {
    const fetchImpl = respond({ error: { code: "AI_BUSY", message: "x" } }, 429, {
      "retry-after": "37",
    });
    const error = await failure(fetchAnalysis("bitcoin", "en", undefined, fetchImpl));
    expect(error.kind).toBe("busy");
    expect(error.retryAfterSeconds).toBe(37);
  });

  it("reports a 404 as not_found", async () => {
    const fetchImpl = respond({ error: { code: "NOT_FOUND", message: "x" } }, 404);
    const error = await failure(fetchAnalysis("tether", "en", undefined, fetchImpl));
    expect(error.kind).toBe("not_found");
    expect(error.retryAfterSeconds).toBeNull();
  });

  it.each([
    ["a 5xx", () => respond({ error: { code: "UPSTREAM_ERROR", message: "x" } }, 502)],
    [
      "a non-JSON error body",
      () => vi.fn<FetchLike>(async () => new Response("oops", { status: 500 })),
    ],
    [
      "a body that breaks the contract",
      () => respond({ data: { ...AI_RESULT, signal: "MOON" }, meta: AI_RESULT.data }),
    ],
    [
      "a network error",
      () => vi.fn<FetchLike>(async () => Promise.reject(new TypeError("offline"))),
    ],
  ])("reports %s as unavailable", async (_label, make) => {
    const error = await failure(fetchAnalysis("bitcoin", "en", undefined, make()));
    expect(error.kind).toBe("unavailable");
  });

  it("rethrows an abort as is", async () => {
    const abort = new DOMException("aborted", "AbortError");
    const fetchImpl = vi.fn<FetchLike>(async () => Promise.reject(abort));
    await expect(fetchAnalysis("bitcoin", "en", undefined, fetchImpl)).rejects.toBe(abort);
  });
});

describe("analyzeEndpoint and parseRetryAfter", () => {
  it("encodes the query", () => {
    expect(analyzeEndpoint("usd-coin", "ar")).toBe("/api/v1/analyze?id=usd-coin&locale=ar");
  });

  it("reads delta seconds and falls back for anything else", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter(null)).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfter("0")).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).toBe(DEFAULT_RETRY_AFTER_SECONDS);
  });
});
