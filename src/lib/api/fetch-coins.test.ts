import { describe, expect, it, vi } from "vitest";

import type { Coin } from "@/lib/domain/market";

import { COINS_ENDPOINT, fetchCoins, nextPollDelay, type FetchLike } from "./fetch-coins";

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

describe("nextPollDelay", () => {
  it("waits for the rest of the interval, never less than 0", () => {
    expect(nextPollDelay(0, 20_000, 60_000)).toBe(40_000);
    expect(nextPollDelay(0, 60_000, 60_000)).toBe(0);
    expect(nextPollDelay(0, 90_000, 60_000)).toBe(0);
  });
});
