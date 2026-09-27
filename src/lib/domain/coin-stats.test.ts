import { describe, expect, it } from "vitest";

import { rangePosition, summarizeSeries, supplyRatio } from "./coin-stats";

describe("rangePosition", () => {
  it("places the price between low (0) and high (1)", () => {
    expect(rangePosition(100, 200, 100)).toBe(0);
    expect(rangePosition(100, 200, 150)).toBe(0.5);
    expect(rangePosition(100, 200, 200)).toBe(1);
  });

  it("clamps a price outside the range", () => {
    expect(rangePosition(100, 200, 90)).toBe(0);
    expect(rangePosition(100, 200, 250)).toBe(1);
  });

  it("returns null without a usable range", () => {
    expect(rangePosition(null, 200, 150)).toBeNull();
    expect(rangePosition(100, null, 150)).toBeNull();
    expect(rangePosition(100, 100, 100)).toBeNull();
    expect(rangePosition(200, 100, 150)).toBeNull();
    expect(rangePosition(100, 200, Number.NaN)).toBeNull();
  });
});

describe("supplyRatio", () => {
  it("divides circulating by max supply", () => {
    expect(supplyRatio(19_800_000, 21_000_000)).toBeCloseTo(0.942857, 5);
    expect(supplyRatio(0, 21_000_000)).toBe(0);
  });

  it("clamps above 1 (upstream supplies can disagree slightly)", () => {
    expect(supplyRatio(1_000_001, 1_000_000)).toBe(1);
  });

  it("returns null without a max supply", () => {
    expect(supplyRatio(120_000_000, null)).toBeNull();
    expect(supplyRatio(null, 21_000_000)).toBeNull();
    expect(supplyRatio(10, 0)).toBeNull();
  });
});

describe("summarizeSeries", () => {
  const point = (date: string, closeUsd: number) => ({ date, closeUsd, volumeUsd: null });

  it("computes change, low, high and direction", () => {
    const summary = summarizeSeries([
      point("2026-09-25", 100),
      point("2026-09-26", 80),
      point("2026-09-27", 110),
    ]);
    expect(summary).toEqual({
      changePct: expect.closeTo(10, 10),
      low: 80,
      high: 110,
      direction: "up",
    });
  });

  it("is down or neutral as displayed", () => {
    expect(summarizeSeries([point("2026-09-26", 100), point("2026-09-27", 95)])?.direction).toBe(
      "down",
    );
    // -0.001% shows as 0.00%: no direction.
    expect(
      summarizeSeries([point("2026-09-26", 100_000), point("2026-09-27", 99_999)])?.direction,
    ).toBe("neutral");
  });

  it("needs two points", () => {
    expect(summarizeSeries([])).toBeNull();
    expect(summarizeSeries([point("2026-09-27", 1)])).toBeNull();
  });
});
