import { describe, expect, it } from "vitest";

import { ApiInputError, parseChartRange, parseCoinId, parseLocale } from "./params";

describe("parseCoinId", () => {
  it.each(["bitcoin", "usd-coin", "0x0", "a", "a".repeat(100)])("accepts %s", (id) => {
    expect(parseCoinId(id)).toBe(id);
  });

  it.each([
    "",
    "BAD_ID",
    "Bitcoin",
    "bit coin",
    "bit_coin",
    "../etc",
    "bitcoin%2F",
    "a".repeat(101),
  ])("rejects %j", (id) => {
    expect(() => parseCoinId(id)).toThrow(ApiInputError);
  });
});

describe("parseChartRange", () => {
  const range = (query: string) => parseChartRange(new URLSearchParams(query));

  it.each([
    ["range=7", 7],
    ["range=30", 30],
    ["range=90", 90],
  ])("parses %s", (query, expected) => {
    expect(range(query)).toBe(expected);
  });

  it.each([
    "",
    "range=",
    "range=14",
    "range=030",
    "range=30.0",
    "range=%2030",
    "range=3e1",
    "days=30",
  ])("rejects %j", (query) => {
    expect(() => range(query)).toThrow(ApiInputError);
  });

  it("never echoes the input in the message", () => {
    expect(() => range("range=<script>")).toThrow("range is required and must be one of 7, 30, 90");
  });
});

describe("parseLocale", () => {
  it.each(["en", "ar", "uz"])("accepts %s", (locale) => {
    expect(parseLocale(new URLSearchParams({ locale }))).toBe(locale);
  });

  it.each([null, "", "fr", "EN", " en", "en-US"])("rejects %j", (locale) => {
    const params = new URLSearchParams(locale === null ? {} : { locale });
    expect(() => parseLocale(params)).toThrow(ApiInputError);
    expect(() => parseLocale(params)).toThrow("locale is required and must be one of en, ar, uz");
  });
});
