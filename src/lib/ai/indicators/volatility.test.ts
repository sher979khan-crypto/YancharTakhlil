import { describe, expect, it } from "vitest";

import { dailyVolatilityPct } from "./volatility";

describe("dailyVolatilityPct", () => {
  it("is the sample standard deviation of daily returns, in percent", () => {
    // Returns: +10%, -10%, +10% -> mean 3.333%, sample sd = sqrt(((6.667^2)*2 + 13.333^2) / 2).
    const closes = [100, 110, 99, 108.9];
    const expected = Math.sqrt(((20 / 3) ** 2 * 2 + (40 / 3) ** 2) / 2);
    expect(dailyVolatilityPct(closes, 3)).toBeCloseTo(expected, 8);
  });

  it("is 0 for a constant growth rate", () => {
    const closes = Array.from({ length: 31 }, (_, i) => 100 * 1.01 ** i);
    expect(dailyVolatilityPct(closes)).toBeCloseTo(0, 10);
  });

  it("uses only the last days + 1 closes", () => {
    const calm = Array.from({ length: 31 }, () => 50);
    expect(dailyVolatilityPct([1, 1000, 1, ...calm])).toBe(0);
  });

  it("is null with fewer than days + 1 closes", () => {
    expect(dailyVolatilityPct(Array.from({ length: 30 }, () => 1))).toBeNull();
    expect(dailyVolatilityPct([1, 2], 1)).toBeNull();
    expect(dailyVolatilityPct([], 30)).toBeNull();
  });

  it("is null when a close in the window is zero", () => {
    expect(dailyVolatilityPct([1, 0, 1, 2], 3)).toBeNull();
  });

  it("rejects non-finite closes", () => {
    expect(() => dailyVolatilityPct([1, Number.NaN, 2], 2)).toThrow(RangeError);
  });
});
