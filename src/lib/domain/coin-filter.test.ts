import { describe, expect, it } from "vitest";

import {
  createExclusionMatcher,
  ExcludedCoinsSchema,
  filterTopCoins,
  isAllowedCoinId,
  type ExcludedCoins,
} from "./coin-filter";

const excluded: ExcludedCoins = {
  version: 1,
  updatedAt: "2026-09-26",
  ids: ["some-bridged-token"],
  stablecoins: ["usdt"],
  wrapped: ["wbtc"],
  tokenizedAssets: ["paxg"],
  other: ["rain"],
};

const coin = (id: string, symbol: string, rank: number) => ({ id, symbol, rank });

describe("filterTopCoins", () => {
  it("drops excluded symbols from every group, case-insensitively", () => {
    const result = filterTopCoins(
      [
        coin("bitcoin", "BTC", 1),
        coin("tether", "USDT", 2),
        coin("wrapped-bitcoin", "wBtC", 3),
        coin("pax-gold", "PAXG", 4),
        coin("rain-coin", "Rain", 5),
      ],
      excluded,
    );
    expect(result.map((c) => c.id)).toEqual(["bitcoin"]);
  });

  it("drops excluded ids, case-insensitively", () => {
    const result = filterTopCoins(
      [coin("bitcoin", "BTC", 1), coin("Some-Bridged-Token", "SBT", 2)],
      excluded,
    );
    expect(result.map((c) => c.id)).toEqual(["bitcoin"]);
  });

  it("drops symbols that are not ASCII alphanumeric", () => {
    const result = filterTopCoins(
      [
        coin("a", "ABC1", 1),
        coin("b", "$WIF", 2),
        coin("c", "ÆTH", 3),
        coin("d", "币安", 4),
        coin("e", "A B", 5),
        coin("f", "", 6),
      ],
      excluded,
    );
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("sorts by rank and re-ranks 1..n without touching the input", () => {
    const input = [
      coin("c", "CCC", 7),
      coin("a", "AAA", 2),
      coin("x", "USDT", 3),
      coin("b", "BBB", 5),
    ];
    const snapshot = structuredClone(input);
    const result = filterTopCoins(input, excluded);
    expect(result).toEqual([coin("a", "AAA", 1), coin("b", "BBB", 2), coin("c", "CCC", 3)]);
    expect(input).toEqual(snapshot);
  });

  it("keeps extra fields", () => {
    const [first] = filterTopCoins([{ ...coin("a", "AAA", 4), priceUsd: 12 }], excluded);
    expect(first).toEqual({ id: "a", symbol: "AAA", rank: 1, priceUsd: 12 });
  });

  it("takes at most `limit` coins, 99 by default", () => {
    const many = Array.from({ length: 150 }, (_, i) => coin(`coin-${i}`, `C${i}`, i + 1));
    expect(filterTopCoins(many, excluded)).toHaveLength(99);
    expect(filterTopCoins(many, excluded, 10).map((c) => c.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(filterTopCoins(many, excluded, 0)).toEqual([]);
  });

  it("rejects an invalid limit", () => {
    expect(() => filterTopCoins([], excluded, -1)).toThrow(RangeError);
    expect(() => filterTopCoins([], excluded, 1.5)).toThrow(RangeError);
  });
});

describe("createExclusionMatcher", () => {
  it("matches by id or symbol", () => {
    const isExcluded = createExclusionMatcher(excluded);
    expect(isExcluded({ id: "tether", symbol: "USDT" })).toBe(true);
    expect(isExcluded({ id: "some-bridged-token", symbol: "OK" })).toBe(true);
    expect(isExcluded({ id: "bitcoin", symbol: "BTC" })).toBe(false);
  });
});

describe("isAllowedCoinId", () => {
  const top = [{ id: "bitcoin" }, { id: "ethereum" }];

  it("accepts only ids in the top list, exactly", () => {
    expect(isAllowedCoinId("bitcoin", top)).toBe(true);
    expect(isAllowedCoinId("tether", top)).toBe(false);
    expect(isAllowedCoinId("Bitcoin", top)).toBe(false);
    expect(isAllowedCoinId("", top)).toBe(false);
  });
});

describe("ExcludedCoinsSchema", () => {
  it("rejects uppercase entries and unknown groups", () => {
    expect(ExcludedCoinsSchema.safeParse({ ...excluded, wrapped: ["WBTC"] }).success).toBe(false);
    expect(ExcludedCoinsSchema.safeParse({ ...excluded, extra: [] }).success).toBe(false);
  });
});
