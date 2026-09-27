import { describe, expect, it } from "vitest";

import { chartTimeToIsoDate, isolateForCanvas, priceMinMove, withAlpha } from "./chart-helpers";

describe("chartTimeToIsoDate", () => {
  it("accepts every time shape the chart can return", () => {
    expect(chartTimeToIsoDate("2026-09-27")).toBe("2026-09-27");
    expect(chartTimeToIsoDate({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
    expect(chartTimeToIsoDate(Date.UTC(2026, 8, 27) / 1000)).toBe("2026-09-27");
  });
});

describe("priceMinMove", () => {
  it("keeps four significant digits below the lowest price", () => {
    expect(priceMinMove(0.00000981)).toBe(1e-9);
    expect(priceMinMove(0.1234)).toBe(0.0001);
  });

  it("is a cent for prices from $10", () => {
    expect(priceMinMove(97_250)).toBe(0.01);
    expect(priceMinMove(12.5)).toBe(0.01);
  });

  it("falls back to a cent for unusable input", () => {
    expect(priceMinMove(0)).toBe(0.01);
    expect(priceMinMove(Number.NaN)).toBe(0.01);
  });
});

describe("withAlpha", () => {
  it("turns hex tokens into rgba", () => {
    expect(withAlpha("#7fe3ff", 0.3)).toBe("rgba(127, 227, 255, 0.3)");
    expect(withAlpha(" #FFF ", 0)).toBe("rgba(255, 255, 255, 0)");
  });

  it("returns other colors unchanged", () => {
    expect(withAlpha("rgb(1, 2, 3)", 0.5)).toBe("rgb(1, 2, 3)");
  });
});

describe("isolateForCanvas", () => {
  it("wraps RTL labels in an RTL isolate and leaves LTR ones alone", () => {
    expect(isolateForCanvas("11 سبتمبر", "rtl")).toBe("\u206711 سبتمبر\u2069");
    expect(isolateForCanvas("Sep 11", "ltr")).toBe("Sep 11");
  });
});
