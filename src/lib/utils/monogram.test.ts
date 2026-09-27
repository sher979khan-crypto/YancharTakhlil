import { describe, expect, it } from "vitest";

import { getMonogram } from "./monogram";

describe("getMonogram", () => {
  it("uses the first letter of the symbol, uppercased", () => {
    expect(getMonogram("btc", "Bitcoin")).toBe("B");
    expect(getMonogram("ETH")).toBe("E");
  });

  it("skips leading whitespace and punctuation", () => {
    expect(getMonogram("  $wif", "dogwifhat")).toBe("W");
    expect(getMonogram(".x")).toBe("X");
  });

  it("accepts digits", () => {
    expect(getMonogram("1inch", "1inch")).toBe("1");
  });

  it("falls back to the name, then to a question mark", () => {
    expect(getMonogram("", "Solana")).toBe("S");
    expect(getMonogram("---", "")).toBe("?");
    expect(getMonogram("")).toBe("?");
  });

  it("never splits a surrogate pair", () => {
    expect(getMonogram("𝔸bc")).toBe("𝔸");
  });

  it("uppercases without Turkish-style locale rules", () => {
    expect(getMonogram("inj")).toBe("I");
  });
});
