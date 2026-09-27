import { describe, expect, it } from "vitest";

import {
  buildTickerItems,
  buildTopMovers,
  defaultDirectionFor,
  defaultSortForTab,
  downsample,
  filterBySearch,
  filterByTab,
  sortCoins,
  SORT_KEYS,
} from "./market-list";

type TestCoin = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  priceUsd: number;
  change1hPct: number | null;
  change24hPct: number | null;
  change7dPct: number | null;
  marketCapUsd: number;
  volume24hUsd: number;
};

function coin(id: string, overrides: Partial<TestCoin> = {}): TestCoin {
  return {
    id,
    name: id,
    symbol: id.toUpperCase(),
    rank: 1,
    priceUsd: 1,
    change1hPct: 0,
    change24hPct: 0,
    change7dPct: 0,
    marketCapUsd: 1,
    volume24hUsd: 1,
    ...overrides,
  };
}

const ids = (coins: readonly { id: string }[]) => coins.map((c) => c.id);

describe("downsample", () => {
  it("keeps the first and last point and spaces the rest evenly", () => {
    const points = Array.from({ length: 11 }, (_, i) => i);
    expect(downsample(points, 3)).toEqual([0, 5, 10]);
    expect(downsample(points, 6)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("reduces 168 hourly points to 42", () => {
    const points = Array.from({ length: 168 }, (_, i) => i);
    const result = downsample(points, 42);
    expect(result).toHaveLength(42);
    expect(result[0]).toBe(0);
    expect(result.at(-1)).toBe(167);
    expect(new Set(result).size).toBe(42);
  });

  it("returns a copy when there are n points or fewer", () => {
    const points = [1, 2, 3];
    const result = downsample(points, 42);
    expect(result).toEqual(points);
    expect(result).not.toBe(points);
    expect(downsample([], 42)).toEqual([]);
  });

  it("rejects an n that cannot keep both ends", () => {
    expect(() => downsample([1, 2, 3], 1)).toThrow(RangeError);
    expect(() => downsample([1, 2, 3], 2.5)).toThrow(RangeError);
  });
});

describe("filterBySearch", () => {
  const coins = [
    coin("bitcoin", { name: "Bitcoin", symbol: "BTC" }),
    coin("ethereum", { name: "Ethereum", symbol: "ETH" }),
    coin("pax-gold", { name: "Pax Gold", symbol: "PAXG" }),
  ];

  it("matches name or symbol, trimmed and case-insensitive", () => {
    expect(ids(filterBySearch(coins, "  eth "))).toEqual(["ethereum"]);
    expect(ids(filterBySearch(coins, "btc"))).toEqual(["bitcoin"]);
    expect(ids(filterBySearch(coins, "GOLD"))).toEqual(["pax-gold"]);
    expect(ids(filterBySearch(coins, "t"))).toEqual(["bitcoin", "ethereum"]);
  });

  it("keeps everything for a blank query and nothing for no match", () => {
    expect(filterBySearch(coins, "   ")).toHaveLength(3);
    expect(filterBySearch(coins, "doge")).toEqual([]);
  });
});

describe("filterByTab", () => {
  const coins = [
    coin("a", { change24hPct: 1 }),
    coin("b", { change24hPct: -3 }),
    coin("c", { change24hPct: 5 }),
    coin("d", { change24hPct: null }),
    coin("e", { change24hPct: 0 }),
    coin("f", { change24hPct: -1 }),
  ];

  it("keeps all coins in their order for 'all'", () => {
    expect(ids(filterByTab(coins, "all"))).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("lists risers biggest first for 'gainers', without flat or unknown moves", () => {
    expect(ids(filterByTab(coins, "gainers"))).toEqual(["c", "a"]);
  });

  it("lists fallers biggest drop first for 'losers'", () => {
    expect(ids(filterByTab(coins, "losers"))).toEqual(["b", "f"]);
  });

  it("does not mutate the input", () => {
    const before = ids(coins);
    filterByTab(coins, "gainers");
    expect(ids(coins)).toEqual(before);
  });
});

describe("sortCoins", () => {
  const coins = [
    coin("b", { name: "beta", rank: 2, priceUsd: 5, change1hPct: null, volume24hUsd: 7 }),
    coin("a", { name: "Alpha", rank: 1, priceUsd: 10, change1hPct: 2, volume24hUsd: 7 }),
    coin("c", { name: "gamma", rank: 3, priceUsd: 1, change1hPct: -1, volume24hUsd: 9 }),
  ];

  it("sorts numbers in both directions", () => {
    expect(ids(sortCoins(coins, "price", "asc"))).toEqual(["c", "b", "a"]);
    expect(ids(sortCoins(coins, "price", "desc"))).toEqual(["a", "b", "c"]);
    expect(ids(sortCoins(coins, "rank", "asc"))).toEqual(["a", "b", "c"]);
  });

  it("sorts names case-insensitively", () => {
    expect(ids(sortCoins(coins, "name", "asc"))).toEqual(["a", "b", "c"]);
    expect(ids(sortCoins(coins, "name", "desc"))).toEqual(["c", "b", "a"]);
  });

  it("always puts nulls last", () => {
    expect(ids(sortCoins(coins, "change1h", "asc"))).toEqual(["c", "a", "b"]);
    expect(ids(sortCoins(coins, "change1h", "desc"))).toEqual(["a", "c", "b"]);
  });

  it("is stable for equal values", () => {
    expect(ids(sortCoins(coins, "volume", "asc"))).toEqual(["b", "a", "c"]);
    expect(ids(sortCoins(coins, "volume", "desc"))).toEqual(["c", "b", "a"]);
  });

  it("supports every sort key without mutating the input", () => {
    const before = ids(coins);
    for (const key of SORT_KEYS) {
      expect(sortCoins(coins, key, "desc")).toHaveLength(coins.length);
    }
    expect(ids(coins)).toEqual(before);
  });
});

describe("sort defaults", () => {
  it("follows each tab's order", () => {
    expect(defaultSortForTab("all")).toEqual({ key: "rank", direction: "asc" });
    expect(defaultSortForTab("gainers")).toEqual({ key: "change24h", direction: "desc" });
    expect(defaultSortForTab("losers")).toEqual({ key: "change24h", direction: "asc" });
  });

  it("starts rank and name ascending, numbers descending", () => {
    expect(defaultDirectionFor("rank")).toBe("asc");
    expect(defaultDirectionFor("name")).toBe("asc");
    expect(defaultDirectionFor("marketCap")).toBe("desc");
  });
});

describe("buildTickerItems", () => {
  it("keeps the first 20 coins by rank, in rank order", () => {
    const coins = Array.from({ length: 30 }, (_, i) => coin(`c${30 - i}`, { rank: 30 - i }));
    const items = buildTickerItems(coins);
    expect(items).toHaveLength(20);
    expect(items.map((c) => c.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("returns every coin when there are fewer than 20, and does not mutate its input", () => {
    const coins = [coin("b", { rank: 2 }), coin("a", { rank: 1 })];
    expect(buildTickerItems(coins).map((c) => c.id)).toEqual(["a", "b"]);
    expect(coins.map((c) => c.id)).toEqual(["b", "a"]);
    expect(buildTickerItems([])).toEqual([]);
  });
});

describe("buildTopMovers", () => {
  it("takes the 5 biggest risers and the 5 biggest fallers", () => {
    const changes = [1, -1, 7, -7, 3, -3, 9, -9, 5, -5, 2, -2, 0];
    const coins = changes.map((change, i) => coin(`c${i}`, { change24hPct: change }));
    const { gainers, losers } = buildTopMovers(coins);
    expect(gainers.map((c) => c.change24hPct)).toEqual([9, 7, 5, 3, 2]);
    expect(losers.map((c) => c.change24hPct)).toEqual([-9, -7, -5, -3, -2]);
  });

  it("excludes coins without a 24h change and flat coins", () => {
    const coins = [
      coin("up", { change24hPct: 4 }),
      coin("none", { change24hPct: null }),
      coin("flat", { change24hPct: 0 }),
      coin("down", { change24hPct: -4 }),
    ];
    const { gainers, losers } = buildTopMovers(coins);
    expect(gainers.map((c) => c.id)).toEqual(["up"]);
    expect(losers.map((c) => c.id)).toEqual(["down"]);
  });

  it("returns empty lists when nothing moved", () => {
    const { gainers, losers } = buildTopMovers([coin("flat", { change24hPct: 0 })]);
    expect(gainers).toEqual([]);
    expect(losers).toEqual([]);
  });
});
