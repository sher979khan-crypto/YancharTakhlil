import { describe, expect, it, vi } from "vitest";

import { MarketDataError } from "@/lib/domain/errors";

import { createStaleCache } from "./stale-cache";

function setup(maxEntries?: number) {
  let time = 0;
  const log = vi.fn<(line: string) => void>();
  const cache = createStaleCache({ now: () => time, log, maxEntries });
  return {
    cache,
    log,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

const upstreamDown = () => Promise.reject(new MarketDataError("UPSTREAM", "down"));

describe("createStaleCache", () => {
  it("serves a fresh value without loading again", async () => {
    const { cache, advance } = setup();
    const load = vi.fn(async () => "v1");
    await cache.load("k", 1000, load);
    advance(999);
    await expect(cache.load("k", 1000, load)).resolves.toEqual({ value: "v1", stale: false });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads once the ttl has passed", async () => {
    const { cache, advance } = setup();
    await cache.load("k", 1000, async () => "v1");
    advance(1000);
    await expect(cache.load("k", 1000, async () => "v2")).resolves.toEqual({
      value: "v2",
      stale: false,
    });
  });

  it("returns the last good value with stale: true when a refresh fails", async () => {
    const { cache, log, advance } = setup();
    await cache.load("markets", 1000, async () => "good");
    advance(5000);
    await expect(cache.load("markets", 1000, upstreamDown)).resolves.toEqual({
      value: "good",
      stale: true,
    });
    expect(log).toHaveBeenCalledWith("[coingecko] markets: UPSTREAM; serving last good data");
    // A later success clears the stale state.
    await expect(cache.load("markets", 1000, async () => "new")).resolves.toEqual({
      value: "new",
      stale: false,
    });
  });

  it("falls back for rate limits and invalid responses too", async () => {
    const { cache, advance } = setup();
    await cache.load("k", 1000, async () => 1);
    advance(1000);
    for (const code of ["RATE_LIMITED", "INVALID_RESPONSE"] as const) {
      const result = await cache.load("k", 1000, () =>
        Promise.reject(new MarketDataError(code, "x")),
      );
      expect(result).toEqual({ value: 1, stale: true });
    }
  });

  it("rethrows when there is nothing to fall back to", async () => {
    const { cache } = setup();
    await expect(cache.load("k", 1000, upstreamDown)).rejects.toMatchObject({ code: "UPSTREAM" });
  });

  it("does not hide NOT_FOUND or unknown errors behind old data", async () => {
    const { cache, advance } = setup();
    await cache.load("k", 1000, async () => 1);
    advance(1000);
    await expect(
      cache.load("k", 1000, () => Promise.reject(new MarketDataError("NOT_FOUND", "gone"))),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(cache.load("k", 1000, () => Promise.reject(new Error("bug")))).rejects.toThrow(
      "bug",
    );
  });

  it("shares one load between concurrent callers", async () => {
    const { cache } = setup();
    let resolve: (value: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const both = Promise.all([cache.load("k", 1000, load), cache.load("k", 1000, load)]);
    resolve("once");
    await expect(both).resolves.toEqual([
      { value: "once", stale: false },
      { value: "once", stale: false },
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("evicts the oldest key beyond maxEntries", async () => {
    const { cache } = setup(2);
    await cache.load("a", 1000, async () => "a");
    await cache.load("b", 1000, async () => "b");
    await cache.load("c", 1000, async () => "c");
    const reload = vi.fn(async () => "a2");
    await cache.load("a", 1000, reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
