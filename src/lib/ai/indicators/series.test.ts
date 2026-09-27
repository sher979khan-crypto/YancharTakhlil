import { describe, expect, it } from "vitest";

import { assertFiniteSeries, assertPeriod, percentFrom } from "./series";

describe("assertFiniteSeries", () => {
  it("accepts finite numbers and rejects NaN or Infinity", () => {
    expect(() => assertFiniteSeries([1, 2.5, -3], "closes")).not.toThrow();
    expect(() => assertFiniteSeries([1, Number.NaN], "closes")).toThrow(RangeError);
    expect(() => assertFiniteSeries([Number.POSITIVE_INFINITY], "closes")).toThrow(/closes/);
  });
});

describe("assertPeriod", () => {
  it("accepts positive integers only", () => {
    expect(() => assertPeriod(14)).not.toThrow();
    for (const bad of [0, -1, 1.5, Number.NaN]) expect(() => assertPeriod(bad)).toThrow(RangeError);
  });
});

describe("percentFrom", () => {
  it("measures the distance from a reference in percent", () => {
    expect(percentFrom(110, 100)).toBeCloseTo(10, 10);
    expect(percentFrom(90, 100)).toBeCloseTo(-10, 10);
  });

  it("is null for a zero or negative reference", () => {
    expect(percentFrom(1, 0)).toBeNull();
    expect(percentFrom(1, -5)).toBeNull();
    expect(percentFrom(Number.NaN, 5)).toBeNull();
  });
});
