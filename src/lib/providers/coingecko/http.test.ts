import { describe, expect, it, vi } from "vitest";

import { MarketDataError } from "@/lib/domain/errors";

import { FIXTURE_NOW, jsonResponse, noSleep } from "./__fixtures__/mock-fetch";
import { COINGECKO_TIMEOUT_MS } from "./config";
import {
  createCoinGeckoFetch,
  getCoinGeckoCallCount,
  retryAfterMs,
  type CoinGeckoHttpConfig,
  type FetchImpl,
} from "./http";

const KEY = "test-key-not-real";
const PARAMS = { vs_currency: "usd", per_page: "250" };
const OPTIONS = { ttl: 120, tags: ["coingecko:markets"] };

function setup(responses: (Response | Error)[], config: Partial<CoinGeckoHttpConfig> = {}) {
  const queue = [...responses];
  const fetchImpl = vi.fn<FetchImpl>(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected extra call");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(noSleep);
  const log = vi.fn<(line: string) => void>();
  const coingeckoFetch = createCoinGeckoFetch({
    apiKey: KEY,
    plan: "demo",
    fetchImpl,
    sleep,
    log,
    now: () => FIXTURE_NOW,
    ...config,
  });
  const call = () => coingeckoFetch("/coins/markets", PARAMS, OPTIONS);
  return { fetchImpl, sleep, log, call };
}

function requestOf(fetchImpl: ReturnType<typeof setup>["fetchImpl"], index = 0) {
  const args = fetchImpl.mock.calls[index];
  if (!args) throw new Error(`no call #${index}`);
  const [url, init] = args;
  return { url, init, headers: new Headers(init.headers) };
}

async function rejection(promise: Promise<unknown>): Promise<MarketDataError> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(MarketDataError);
  if (!(error instanceof MarketDataError)) throw new Error("not a MarketDataError");
  // Nothing identifying the request may leak into messages.
  expect(error.message).not.toContain(KEY);
  expect(error.message).not.toContain("coingecko.com");
  return error;
}

describe("createCoinGeckoFetch: request", () => {
  it("sends the demo key only in the demo header", async () => {
    const { fetchImpl, call } = setup([jsonResponse([])]);
    await call();
    const { url, headers } = requestOf(fetchImpl);
    expect(url).toBe("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=250");
    expect(url).not.toContain(KEY);
    expect(headers.get("x-cg-demo-api-key")).toBe(KEY);
    expect(headers.has("x-cg-pro-api-key")).toBe(false);
  });

  it("uses the pro base URL and header for the pro plan", async () => {
    const { fetchImpl, call } = setup([jsonResponse([])], { plan: "pro" });
    await call();
    const { url, headers } = requestOf(fetchImpl);
    expect(url.startsWith("https://pro-api.coingecko.com/api/v3/coins/markets?")).toBe(true);
    expect(url).not.toContain(KEY);
    expect(headers.get("x-cg-pro-api-key")).toBe(KEY);
    expect(headers.has("x-cg-demo-api-key")).toBe(false);
  });

  it("omits the query string when there are no params", async () => {
    const { fetchImpl } = setup([jsonResponse({})]);
    const coingeckoFetch = createCoinGeckoFetch({ apiKey: KEY, plan: "demo", fetchImpl });
    await coingeckoFetch("/global", {}, { ttl: 600 });
    expect(requestOf(fetchImpl).url).toBe("https://api.coingecko.com/api/v3/global");
  });

  it("opts into the Next.js data cache with the ttl and tags, and sets a timeout signal", async () => {
    const { fetchImpl, call } = setup([jsonResponse([])]);
    await call();
    const { init } = requestOf(fetchImpl);
    expect(init.next).toEqual({ revalidate: 120, tags: ["coingecko:markets"] });
    expect(init.cache).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(COINGECKO_TIMEOUT_MS).toBe(8000);
  });

  it("logs one line per call with the path only, and counts calls", async () => {
    const before = getCoinGeckoCallCount();
    const { log, call } = setup([jsonResponse([])]);
    await call();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[coingecko] GET /coins/markets 200 0ms");
    expect(getCoinGeckoCallCount()).toBe(before + 1);
  });

  it("returns the body and the Date header as the response time", async () => {
    const { call } = setup([jsonResponse([{ id: "bitcoin" }])]);
    await expect(call()).resolves.toEqual({
      body: [{ id: "bitcoin" }],
      receivedAt: "2026-09-26T12:00:00.000Z",
    });
  });

  it("falls back to the clock when the Date header is missing or in the future", async () => {
    const future = jsonResponse([], { headers: { date: "Sun, 27 Sep 2026 00:00:00 GMT" } });
    const missing = new Response("[]", { status: 200 });
    const { call } = setup([future, missing]);
    const expected = new Date(FIXTURE_NOW).toISOString();
    expect((await call()).receivedAt).toBe(expected);
    expect((await call()).receivedAt).toBe(expected);
  });
});

describe("createCoinGeckoFetch: failures", () => {
  it("times out after the configured time without retrying", async () => {
    const fetchImpl = vi.fn<FetchImpl>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const log = vi.fn<(line: string) => void>();
    const coingeckoFetch = createCoinGeckoFetch({
      apiKey: KEY,
      plan: "demo",
      fetchImpl,
      timeoutMs: 20,
      sleep: noSleep,
      log,
    });
    const error = await rejection(coingeckoFetch("/global", {}, { ttl: 600 }));
    expect(error).toMatchObject({ code: "UPSTREAM", message: "CoinGecko request timed out" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[coingecko\] GET \/global timeout \d+ms$/);
  });

  it("retries a 429 once after Retry-After", async () => {
    const limited = jsonResponse({}, { status: 429, headers: { "retry-after": "2" } });
    const { fetchImpl, sleep, call } = setup([limited, jsonResponse(["ok"])]);
    await expect(call()).resolves.toMatchObject({ body: ["ok"] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("gives up with RATE_LIMITED after a second 429", async () => {
    const limited = () => jsonResponse({}, { status: 429, headers: { "retry-after": "60" } });
    const { fetchImpl, sleep, call } = setup([limited(), limited()]);
    expect(await rejection(call())).toMatchObject({ code: "RATE_LIMITED" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("retries a 5xx once after 500 ms", async () => {
    const { fetchImpl, sleep, call } = setup([
      jsonResponse({}, { status: 503 }),
      jsonResponse(["ok"]),
    ]);
    await expect(call()).resolves.toMatchObject({ body: ["ok"] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("gives up with UPSTREAM after a second 5xx", async () => {
    const { fetchImpl, call } = setup([
      jsonResponse({}, { status: 500 }),
      jsonResponse({}, { status: 502 }),
    ]);
    expect(await rejection(call())).toMatchObject({
      code: "UPSTREAM",
      message: "CoinGecko request failed with status 502",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries a network error once", async () => {
    const { fetchImpl, call } = setup([
      new TypeError(`fetch failed for https://api.coingecko.com/?key=${KEY}`),
      new TypeError("fetch failed"),
    ]);
    expect(await rejection(call())).toMatchObject({
      code: "UPSTREAM",
      message: "CoinGecko could not be reached",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps 404 to NOT_FOUND without a retry", async () => {
    const { fetchImpl, call } = setup([jsonResponse({ error: "coin not found" }, { status: 404 })]);
    expect(await rejection(call())).toMatchObject({ code: "NOT_FOUND" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry other 4xx or echo the upstream body", async () => {
    const { fetchImpl, call } = setup([
      jsonResponse({ status: { error_message: `Invalid key ${KEY}` } }, { status: 401 }),
    ]);
    expect(await rejection(call())).toMatchObject({ code: "UPSTREAM" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps a body that is not JSON to INVALID_RESPONSE", async () => {
    const { call } = setup([new Response("<html>oops</html>", { status: 200 })]);
    expect(await rejection(call())).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("never logs the key or the query string", async () => {
    const { log, call } = setup([jsonResponse({}, { status: 500 }), new TypeError("boom")]);
    await rejection(call());
    const logged = log.mock.calls.flat().join("\n");
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain("?");
    expect(logged).not.toContain("vs_currency");
  });
});

describe("retryAfterMs", () => {
  it("reads seconds, caps them at 3 s and defaults to 1 s", () => {
    expect(retryAfterMs("1")).toBe(1000);
    expect(retryAfterMs("0")).toBe(0);
    expect(retryAfterMs("120")).toBe(3000);
    expect(retryAfterMs(null)).toBe(1000);
    expect(retryAfterMs("Wed, 21 Oct 2026 07:28:00 GMT")).toBe(1000);
    expect(retryAfterMs("-5")).toBe(1000);
  });
});
