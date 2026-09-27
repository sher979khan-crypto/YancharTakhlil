import { describe, expect, it } from "vitest";

import {
  blend,
  brighter,
  composite,
  contrastRatio,
  formatRatio,
  parseHex,
  relativeLuminance,
} from "./contrast";

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

describe("composite", () => {
  it("applies layers bottom to top", () => {
    const white = [255, 255, 255] as const;
    const black = [0, 0, 0] as const;
    expect(composite(black, [])).toEqual(black);
    // 50% white, then 50% black on top: the top layer wins half of the result.
    expect(composite(black, [{ color: white, alpha: 0.5 }])).toEqual([128, 128, 128]);
    expect(
      composite(black, [
        { color: white, alpha: 0.5 },
        { color: black, alpha: 0.5 },
      ]),
    ).toEqual([64, 64, 64]);
  });

  it("equals nested blends", () => {
    const base = parseHex("#07090d");
    const a = parseHex("#7fe3ff");
    const b = parseHex("#0c1017");
    expect(
      composite(base, [
        { color: a, alpha: 0.06 },
        { color: b, alpha: 0.55 },
      ]),
    ).toEqual(blend(b, blend(a, base, 0.06), 0.55));
  });
});

describe("brighter", () => {
  it("picks the color with the higher luminance", () => {
    expect(brighter([10, 10, 10], [20, 20, 20])).toEqual([20, 20, 20]);
    expect(brighter([200, 0, 0], [0, 120, 0])).toEqual([0, 120, 0]);
  });
});

describe("formatRatio", () => {
  it("truncates so a failing ratio never looks like a pass", () => {
    expect(formatRatio(4.499)).toBe("4.49:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });
});
