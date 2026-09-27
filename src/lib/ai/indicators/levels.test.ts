import { describe, expect, it } from "vitest";

import { priceLevels } from "./levels";

describe("priceLevels", () => {
  it("finds the low and high of the last `days` closes and the distance from each", () => {
    const closes = [1, 500, 80, 100, 120, 90];
    const levels = priceLevels(closes, 99, 4);
    expect(levels).toMatchObject({ low: 80, high: 120 });
    expect(levels?.fromLowPct).toBeCloseTo(23.75, 10);
    expect(levels?.fromHighPct).toBeCloseTo(-17.5, 10);
  });

  it("is null with fewer closes than the window", () => {
    expect(priceLevels([1, 2, 3], 2, 4)).toBeNull();
  });

  it("works with exactly `days` closes", () => {
    expect(priceLevels([3, 1, 2], 2, 3)).toMatchObject({ low: 1, high: 3 });
  });

  it("has null distances when a level is zero", () => {
    expect(priceLevels([0, 2], 1, 2)).toMatchObject({ low: 0, fromLowPct: null, fromHighPct: -50 });
  });

  it("rejects non-finite closes", () => {
    expect(() => priceLevels([1, Number.POSITIVE_INFINITY], 1, 2)).toThrow(RangeError);
  });
});
