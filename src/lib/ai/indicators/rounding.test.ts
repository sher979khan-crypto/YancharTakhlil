import { describe, expect, it } from "vitest";

import { roundPct, roundRatio, roundUsdLarge, roundUsdPrice } from "./rounding";

describe("roundPct", () => {
  it("keeps two decimals", () => {
    expect(roundPct(12.3456)).toBe(12.35);
    expect(roundPct(-0.126)).toBe(-0.13);
    expect(roundPct(70.53)).toBe(70.53);
  });

  it("never returns -0", () => {
    for (const value of [-0, -0.001, -0.004999]) {
      expect(Object.is(roundPct(value), 0)).toBe(true);
    }
    expect(JSON.stringify({ v: roundPct(-0.001) })).toBe('{"v":0}');
  });
});

describe("roundUsdPrice", () => {
  it("keeps six significant digits for large and tiny prices", () => {
    expect(roundUsdPrice(64250.5678)).toBe(64250.6);
    expect(roundUsdPrice(1.23456789)).toBe(1.23457);
    expect(roundUsdPrice(0.0000098123456)).toBe(0.00000981235);
    expect(roundUsdPrice(123456789)).toBe(123457000);
  });

  it("keeps zero as zero", () => {
    expect(roundUsdPrice(0)).toBe(0);
    expect(Object.is(roundUsdPrice(-0), 0)).toBe(true);
  });
});

describe("roundUsdLarge", () => {
  it("keeps three significant digits", () => {
    expect(roundUsdLarge(1_265_432_109_876)).toBe(1_270_000_000_000);
    expect(roundUsdLarge(38_123_456)).toBe(38_100_000);
    expect(roundUsdLarge(999.9)).toBe(1000);
  });
});

describe("roundRatio", () => {
  it("keeps four decimals", () => {
    expect(roundRatio(0.123456)).toBe(0.1235);
    expect(Object.is(roundRatio(-0.00001), 0)).toBe(true);
  });
});

describe("all rounding helpers", () => {
  it("map null, NaN and Infinity to null", () => {
    for (const round of [roundPct, roundRatio, roundUsdLarge, roundUsdPrice]) {
      expect(round(null)).toBeNull();
      expect(round(Number.NaN)).toBeNull();
      expect(round(Number.POSITIVE_INFINITY)).toBeNull();
      expect(round(Number.NEGATIVE_INFINITY)).toBeNull();
    }
  });
});
