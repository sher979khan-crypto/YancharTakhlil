import { describe, expect, it } from "vitest";

import { volumeToMarketCapPct, volumeTrendPct } from "./volume";

describe("volumeToMarketCapPct", () => {
  it("is volume / market cap in percent", () => {
    expect(volumeToMarketCapPct(25, 1000)).toBe(2.5);
  });

  it("is null without a positive market cap or with bad volume", () => {
    expect(volumeToMarketCapPct(25, 0)).toBeNull();
    expect(volumeToMarketCapPct(-1, 100)).toBeNull();
    expect(volumeToMarketCapPct(Number.NaN, 100)).toBeNull();
  });
});

const days = (count: number, value: number) => Array.from({ length: count }, () => value);

describe("volumeTrendPct", () => {
  it("compares the last 7 days with the 23 before them", () => {
    expect(volumeTrendPct([...days(23, 100), ...days(7, 150)])).toBeCloseTo(50, 10);
    expect(volumeTrendPct([...days(23, 200), ...days(7, 100)])).toBeCloseTo(-50, 10);
  });

  it("ignores volumes older than 30 days", () => {
    expect(volumeTrendPct([null, 1e12, ...days(30, 10)])).toBe(0);
  });

  it("is null with fewer than 30 volumes", () => {
    expect(volumeTrendPct(days(29, 10))).toBeNull();
  });

  it("is null with a gap in the window or a zero baseline", () => {
    expect(volumeTrendPct([...days(22, 10), null, ...days(7, 10)])).toBeNull();
    expect(volumeTrendPct([...days(23, 0), ...days(7, 10)])).toBeNull();
  });
});
