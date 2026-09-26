import { describe, expect, it } from "vitest";

import { formatPercent } from "@/lib/i18n/format";

import { getMoveDirection, getPriceDirection } from "./price-direction";

describe("getPriceDirection", () => {
  it("classifies positive, negative and zero", () => {
    expect(getPriceDirection(2.5, 2)).toBe("up");
    expect(getPriceDirection(-1.2, 2)).toBe("down");
    expect(getPriceDirection(0, 2)).toBe("neutral");
    expect(getPriceDirection(-0, 2)).toBe("neutral");
  });

  it("treats changes that round to zero as neutral", () => {
    expect(getPriceDirection(0.004, 2)).toBe("neutral");
    expect(getPriceDirection(-0.004, 2)).toBe("neutral");
    expect(getPriceDirection(0.004, 3)).toBe("up");
  });

  it("treats non-finite input as neutral", () => {
    expect(getPriceDirection(Number.NaN, 2)).toBe("neutral");
    expect(getPriceDirection(Number.POSITIVE_INFINITY, 2)).toBe("neutral");
  });

  // The arrow must never contradict the sign that formatPercent prints.
  it.each([2.5, -1.2, 0, 0.004, -0.004, 0.005, -0.005, 0.0051, -0.0051, 12345.678])(
    "agrees with the sign formatPercent shows for %s",
    (value) => {
      const text = formatPercent(value, "en");
      const expected = text.startsWith("+") ? "up" : text.startsWith("-") ? "down" : "neutral";
      expect(getPriceDirection(value, 2)).toBe(expected);
    },
  );
});

describe("getMoveDirection", () => {
  it("compares the raw values", () => {
    expect(getMoveDirection(1, 1.0001)).toBe("up");
    expect(getMoveDirection(1, 0.9999)).toBe("down");
    expect(getMoveDirection(1, 1)).toBe("neutral");
  });
});
