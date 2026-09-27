import { describe, expect, it } from "vitest";

import { nextRovingIndex } from "./roving-index";

describe("nextRovingIndex", () => {
  it("moves forward and backward in LTR", () => {
    expect(nextRovingIndex(0, "ArrowRight", 3, "ltr")).toBe(1);
    expect(nextRovingIndex(1, "ArrowLeft", 3, "ltr")).toBe(0);
  });

  it("follows reading direction in RTL", () => {
    expect(nextRovingIndex(0, "ArrowLeft", 3, "rtl")).toBe(1);
    expect(nextRovingIndex(1, "ArrowRight", 3, "rtl")).toBe(0);
  });

  it("uses Up/Down as previous/next in both directions", () => {
    for (const dir of ["ltr", "rtl"] as const) {
      expect(nextRovingIndex(1, "ArrowDown", 3, dir)).toBe(2);
      expect(nextRovingIndex(1, "ArrowUp", 3, dir)).toBe(0);
    }
  });

  it("wraps around at both ends", () => {
    expect(nextRovingIndex(2, "ArrowRight", 3, "ltr")).toBe(0);
    expect(nextRovingIndex(0, "ArrowLeft", 3, "ltr")).toBe(2);
    expect(nextRovingIndex(2, "ArrowLeft", 3, "rtl")).toBe(0);
    expect(nextRovingIndex(0, "ArrowRight", 3, "rtl")).toBe(2);
  });

  it("jumps with Home and End", () => {
    expect(nextRovingIndex(1, "Home", 3, "ltr")).toBe(0);
    expect(nextRovingIndex(1, "End", 3, "rtl")).toBe(2);
  });

  it("ignores other keys and empty groups", () => {
    expect(nextRovingIndex(1, "Enter", 3, "ltr")).toBeNull();
    expect(nextRovingIndex(1, "a", 3, "ltr")).toBeNull();
    expect(nextRovingIndex(0, "ArrowRight", 0, "ltr")).toBeNull();
  });

  it("recovers from an out-of-range current index (no selection)", () => {
    expect(nextRovingIndex(-1, "ArrowRight", 3, "ltr")).toBe(1);
    expect(nextRovingIndex(9, "ArrowLeft", 3, "ltr")).toBe(1);
  });
});
