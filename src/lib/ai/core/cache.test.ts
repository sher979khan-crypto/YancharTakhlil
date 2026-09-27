import { describe, expect, it, vi } from "vitest";

import { createTtlCache } from "./cache";

function setup(ttlMs = 1000, maxEntries?: number) {
  let now = 0;
  const cache = createTtlCache({ ttlMs, now: () => now, maxEntries });
  return {
    cache,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("createTtlCache", () => {
  it("serves a stored value until the ttl passes, then loads again", async () => {
    const { cache, advance } = setup();
    const load = vi.fn(async () => "value");
    expect(cache.get("k")).toBeUndefined();
    await expect(cache.load("k", load)).resolves.toBe("value");
    advance(999);
    await expect(cache.load("k", load)).resolves.toBe("value");
    expect(cache.get("k")).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);
    advance(1);
    expect(cache.get("k")).toBeUndefined();
    await cache.load("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never serves an expired value, even if the reload fails", async () => {
    const { cache, advance } = setup();
    await cache.load("k", async () => "old");
    advance(1000);
    await expect(
      cache.load("k", async () => {
        throw new Error("down");
      }),
    ).rejects.toThrow("down");
    expect(cache.get("k")).toBeUndefined();
  });

  it("shares one load between concurrent callers of a key", async () => {
    const { cache } = setup();
    let resolve: (value: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const first = cache.load("k", load);
    const second = cache.load("k", load);
    resolve("shared");
    await expect(Promise.all([first, second])).resolves.toEqual(["shared", "shared"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load, and all waiting callers get the error", async () => {
    const { cache } = setup();
    const failing = vi.fn(async () => {
      throw new Error("nope");
    });
    const results = await Promise.allSettled([cache.load("k", failing), cache.load("k", failing)]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(failing).toHaveBeenCalledTimes(1);
    await expect(cache.load("k", async () => "ok")).resolves.toBe("ok");
  });

  it("keeps keys separate and evicts the oldest write beyond maxEntries", async () => {
    const { cache } = setup(1000, 2);
    await cache.load("a", async () => 1);
    await cache.load("b", async () => 2);
    await cache.load("c", async () => 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});
