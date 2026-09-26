import { describe, expect, it } from "vitest";

import { changedChars } from "./changed-chars";

describe("changedChars", () => {
  it("flags only the digits that changed", () => {
    expect(changedChars("$64,250.50", "$64,251.75")).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
    ]);
  });

  it("aligns from the end when the length grows", () => {
    expect(changedChars("$9.99", "$10.99")).toEqual([true, true, true, false, false, false]);
  });

  it("aligns from the end when the length shrinks", () => {
    expect(changedChars("$10.50", "$9.50")).toEqual([true, true, false, false, false]);
  });

  it("returns all false for identical strings and all true from empty", () => {
    expect(changedChars("1.23", "1.23")).toEqual([false, false, false, false]);
    expect(changedChars("", "12")).toEqual([true, true]);
  });
});
