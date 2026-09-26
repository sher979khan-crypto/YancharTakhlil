import { describe, expect, it } from "vitest";

import { blend, contrastRatio, formatRatio, parseHex, relativeLuminance } from "./contrast";

describe("parseHex", () => {
  it("parses #rrggbb in any case", () => {
    expect(parseHex("#ffB547")).toEqual([255, 181, 71]);
    expect(parseHex(" #000000 ")).toEqual([0, 0, 0]);
  });

  it("rejects other formats", () => {
    expect(() => parseHex("#fff")).toThrow();
    expect(() => parseHex("rgb(0,0,0)")).toThrow();
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 10);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
    // #767676 on white is the well-known 4.54:1 AA threshold gray.
    expect(contrastRatio(parseHex("#767676"), parseHex("#ffffff"))).toBeCloseTo(4.54, 2);
  });

  it("is symmetric", () => {
    const a = parseHex("#3ddc97");
    const b = parseHex("#0c1017");
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });
});

describe("blend", () => {
  it("composites with alpha", () => {
    expect(blend([255, 255, 255], [0, 0, 0], 0.5)).toEqual([128, 128, 128]);
    expect(blend([10, 20, 30], [0, 0, 0], 1)).toEqual([10, 20, 30]);
    expect(blend([10, 20, 30], [40, 50, 60], 0)).toEqual([40, 50, 60]);
  });
});

describe("formatRatio", () => {
  it("truncates so a failing ratio never looks like a pass", () => {
    expect(formatRatio(4.499)).toBe("4.49:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });
});
