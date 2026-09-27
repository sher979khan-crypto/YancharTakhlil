import { describe, expect, it } from "vitest";

import { sma } from "./moving-average";

describe("sma", () => {
  it("averages only the last `period` values", () => {
    expect(sma([100, 1, 2, 3], 3)).toBe(2);
    expect(sma([10, 20, 30, 40, 50], 5)).toBe(30);
  });

  it("uses exactly `period` values when that is all there is", () => {
    expect(sma([4, 8], 2)).toBe(6);
  });

  it("is null with fewer values than the period", () => {
    expect(sma([], 1)).toBeNull();
    expect(sma([1, 2], 3)).toBeNull();
  });

  it("with period 1 is the last value", () => {
    expect(sma([3, 9, 7], 1)).toBe(7);
  });

  it("rejects non-finite values and bad periods", () => {
    expect(() => sma([1, Number.NaN], 2)).toThrow(RangeError);
    expect(() => sma([1, 2], 0)).toThrow(RangeError);
    expect(() => sma([1, 2], 1.5)).toThrow(RangeError);
  });
});
