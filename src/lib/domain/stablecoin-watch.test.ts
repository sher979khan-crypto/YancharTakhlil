import { describe, expect, it } from "vitest";

import { findPossibleStablecoins } from "./stablecoin-watch";

function coin(id: string, priceUsd: number, change7dPct: number | null) {
  return { id, symbol: id.toUpperCase(), priceUsd, change7dPct };
}

describe("findPossibleStablecoins", () => {
  it("flags coins near $1 with a flat 7-day move", () => {
    const coins = [coin("usdx", 1.0001, 0.01), coin("btc", 65_000, 3), coin("eurx", 1.17, 0.1)];
    expect(findPossibleStablecoins(coins).map((c) => c.id)).toEqual(["usdx"]);
  });

  it("includes both boundaries", () => {
    expect(findPossibleStablecoins([coin("a", 0.98, -0.5), coin("b", 1.02, 0.5)])).toHaveLength(2);
  });

  it("ignores coins just outside either threshold", () => {
    expect(findPossibleStablecoins([coin("a", 0.979, 0), coin("b", 1, 0.51)])).toEqual([]);
    expect(findPossibleStablecoins([coin("c", 1.021, 0), coin("d", 1, -0.51)])).toEqual([]);
  });

  it("needs a known 7-day change", () => {
    expect(findPossibleStablecoins([coin("a", 1, null)])).toEqual([]);
  });

  it("returns the input objects without changing the input", () => {
    const input = [coin("a", 1, 0), coin("b", 2, 0)];
    const found = findPossibleStablecoins(input);
    expect(found[0]).toBe(input[0]);
    expect(input).toHaveLength(2);
  });
});
