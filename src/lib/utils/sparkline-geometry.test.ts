import { describe, expect, it } from "vitest";

import { getSparklineGeometry } from "./sparkline-geometry";

describe("getSparklineGeometry", () => {
  it("spreads points across the width with the highest price at the top", () => {
    expect(getSparklineGeometry([1, 3, 2], 100, 10, 1)).toEqual({
      line: "0,9 50,1 100,5",
      area: "0,10 0,9 50,1 100,5 100,10",
    });
  });

  it("draws a flat series through the middle", () => {
    expect(getSparklineGeometry([5, 5, 5], 10, 20)?.line).toBe("0,10 5,10 10,10");
  });

  it("ignores non-finite values and needs two points", () => {
    expect(getSparklineGeometry([1, Number.NaN, 2], 10, 10, 0)?.line).toBe("0,10 10,0");
    expect(getSparklineGeometry([1], 10, 10)).toBeNull();
    expect(getSparklineGeometry([], 10, 10)).toBeNull();
  });
});
