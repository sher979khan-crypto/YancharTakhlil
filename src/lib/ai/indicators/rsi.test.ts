import { describe, expect, it } from "vitest";

import { rsi, rsiSeries } from "./rsi";

// Reference: StockCharts ChartSchool, "Relative Strength Index (RSI)", calculation example and its
// spreadsheet (cs-rsi.xls):
// https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi
// The spreadsheet shows closes with 2 decimals but computes with the 4-decimal values below;
// the 2-decimal closes give RSI values about 0.07 lower than the published column.
const STOCKCHARTS_CLOSES = [
  44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826, 45.8931,
  46.0328, 45.614, 46.282, 46.282, 46.0028, 46.0328, 46.4116, 46.2222, 45.6439, 46.2122, 46.2521,
  45.7137, 46.4515, 45.7835, 45.3548, 44.0288, 44.1783, 44.2181, 44.5672, 43.4205, 42.6628, 43.1314,
];
// The published 14-day RSI column, from the 15th close on.
const STOCKCHARTS_RSI = [
  70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38, 54.71, 50.42, 39.99, 41.46,
  41.87, 45.46, 37.3, 33.08, 37.77,
];

describe("rsiSeries", () => {
  it("matches the StockCharts worked example to 2 decimals", () => {
    const values = rsiSeries(STOCKCHARTS_CLOSES, 14);
    expect(values).toHaveLength(STOCKCHARTS_RSI.length);
    values.forEach((value, i) => expect(value).toBeCloseTo(STOCKCHARTS_RSI[i] ?? Number.NaN, 2));
  });

  it("is empty with fewer than period + 1 closes", () => {
    expect(rsiSeries(STOCKCHARTS_CLOSES.slice(0, 14), 14)).toEqual([]);
    expect(rsiSeries(STOCKCHARTS_CLOSES.slice(0, 15), 14)).toHaveLength(1);
  });

  it("rejects non-finite closes and bad periods", () => {
    expect(() => rsiSeries([1, 2, Number.NaN], 1)).toThrow(RangeError);
    expect(() => rsiSeries([1, 2, 3], 0)).toThrow(RangeError);
  });
});

describe("rsi", () => {
  it("returns the latest value with the default period of 14", () => {
    expect(rsi(STOCKCHARTS_CLOSES)).toBeCloseTo(37.77, 2);
  });

  it("returns null without enough data", () => {
    expect(rsi([])).toBeNull();
    expect(rsi(STOCKCHARTS_CLOSES.slice(0, 14))).toBeNull();
  });

  it("is 100 when prices only rise, 0 when they only fall, and 50 when flat", () => {
    const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(rising)).toBe(100);
    expect(rsi([...rising].reverse())).toBe(0);
    expect(rsi(Array.from({ length: 20 }, () => 5))).toBe(50);
  });
});
