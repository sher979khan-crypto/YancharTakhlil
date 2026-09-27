import { describe, expect, it, vi } from "vitest";

import type { Coin, CoinDetail } from "@/lib/domain/market";

import {
  coinChartEndpoint,
  COINS_ENDPOINT,
  fetchCoinChart,
  fetchCoinDetail,
  fetchCoins,
  nextPollDelay,
  type FetchLike,
} from "./fetch-coins";

const coin: Coin = {
  id: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  imageUrl: null,
  rank: 1,
  priceUsd: 97_250,
  marketCapUsd: 1.9e12,
  volume24hUsd: 3.8e10,
  change1hPct: 0.2,
  change24hPct: 1.8,
  change7dPct: null,
  high24hUsd: null,
  low24hUsd: null,
  lastUpdated: "2026-09-26T00:00:00Z",
  sparkline7d: [1, 2, 3],
};
const meta = { source: "fixture", fetchedAt: "2026-09-26T00:00:00Z", stale: false } as const;

function respond(body: unknown, status = 200) {
  return vi.fn<FetchLike>(async () => Response.json(body, { status }));
}

describe("fetchCoins", () => {
  it("returns the validated result as a MarketResult", async () => {
    const fetchImpl = respond({ data: [coin], meta });
    await expect(fetchCoins(undefined, fetchImpl)).resolves.toEqual({ ...meta, data: [coin] });
    expect(fetchImpl).toHaveBeenCalledWith(COINS_ENDPOINT, expect.anything());
  });

  it("passes the abort signal through", async () => {
    const fetchImpl = respond({ data: [coin], meta });
    const controller = new AbortController();
    await fetchCoins(controller.signal, fetchImpl);
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("throws on an error status", async () => {
    const fetchImpl = respond({ error: { code: "UPSTREAM_ERROR", message: "x" } }, 502);
    await expect(fetchCoins(undefined, fetchImpl)).rejects.toThrow("502");
  });

  it("throws when the body breaks the contract", async () => {
    const fetchImpl = respond({ data: [{ ...coin, priceUsd: -1 }], meta });
    await expect(fetchCoins(undefined, fetchImpl)).rejects.toThrow("invalid body");
  });
});

describe("fetchCoinDetail", () => {
  const detail: CoinDetail = {
    ...coin,
    change30dPct: 4.2,
    circulatingSupply: 19.8e6,
    totalSupply: 19.8e6,
    maxSupply: 21e6,
    fullyDilutedValuationUsd: 2e12,
    athUsd: 126_000,
    athChangePct: -22.8,
    athDate: "2025-10-06T00:00:00Z",
    atlUsd: 67.81,
    atlChangePct: 143_000,
    atlDate: "2013-07-06T00:00:00Z",
  };

  it("requests the coin's endpoint and validates the detail", async () => {
    const fetchImpl = respond({ data: detail, meta });
    await expect(fetchCoinDetail("bitcoin", undefined, fetchImpl)).resolves.toEqual({
      ...meta,
      data: detail,
    });
    expect(fetchImpl).toHaveBeenCalledWith("/api/v1/coins/bitcoin", expect.anything());
  });

  it("throws on a 404 and on a body without the detail fields", async () => {
    const notFound = respond({ error: { code: "NOT_FOUND", message: "x" } }, 404);
    await expect(fetchCoinDetail("nope", undefined, notFound)).rejects.toThrow("404");
    const plainCoin = respond({ data: coin, meta });
    await expect(fetchCoinDetail("bitcoin", undefined, plainCoin)).rejects.toThrow("invalid body");
  });
});

describe("fetchCoinChart", () => {
  const points = [
    { date: "2026-09-25", closeUsd: 96_000, volumeUsd: 3e10 },
    { date: "2026-09-26", closeUsd: 97_250, volumeUsd: null },
  ];

  it("requests the range and validates the points", async () => {
    const fetchImpl = respond({ data: points, meta });
    await expect(fetchCoinChart("bitcoin", 90, undefined, fetchImpl)).resolves.toEqual({
      ...meta,
      data: points,
    });
    expect(fetchImpl).toHaveBeenCalledWith(coinChartEndpoint("bitcoin", 90), expect.anything());
    expect(coinChartEndpoint("bitcoin", 90)).toBe("/api/v1/coins/bitcoin/chart?range=90");
  });

  it("throws when a point breaks the contract", async () => {
    const fetchImpl = respond({ data: [{ date: "yesterday", closeUsd: 1 }], meta });
    await expect(fetchCoinChart("bitcoin", 7, undefined, fetchImpl)).rejects.toThrow(
      "invalid body",
    );
  });
});

describe("browser HTTP cache", () => {
  const expected = expect.objectContaining({ cache: "no-store" });

  it("bypasses it for every fetcher, so polls always reach the network", async () => {
    const list = respond({ data: [coin], meta });
    await fetchCoins(undefined, list);
    expect(list).toHaveBeenCalledWith(COINS_ENDPOINT, expected);

    const detail = respond({ error: { code: "NOT_FOUND", message: "x" } }, 404);
    await expect(fetchCoinDetail("bitcoin", undefined, detail)).rejects.toThrow();
    expect(detail).toHaveBeenCalledWith("/api/v1/coins/bitcoin", expected);

    const chart = respond({ data: [], meta });
    await fetchCoinChart("bitcoin", 7, undefined, chart);
    expect(chart).toHaveBeenCalledWith(coinChartEndpoint("bitcoin", 7), expected);
  });
});

describe("nextPollDelay", () => {
  it("waits for the rest of the interval, never less than 0", () => {
    expect(nextPollDelay(0, 20_000, 60_000)).toBe(40_000);
    expect(nextPollDelay(0, 60_000, 60_000)).toBe(0);
    expect(nextPollDelay(0, 90_000, 60_000)).toBe(0);
  });
});
