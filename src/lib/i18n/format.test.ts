import { afterEach, describe, expect, it, vi } from "vitest";

import { locales, type Locale } from "./config";
import {
  formatCompactCurrency,
  formatPercent,
  formatPercentUnsigned,
  formatPrice,
  NOT_A_NUMBER,
} from "./format";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;
const BIDI_CONTROLS = /[‎‏؜‪-‮⁦-⁩]/;
const NBSP = " ";

const formatters = [formatPrice, formatPercent, formatPercentUnsigned, formatCompactCurrency];

describe("formatPrice", () => {
  it("uses 2 fraction digits for prices >= 1", () => {
    expect(formatPrice(64250.5, "en")).toBe("$64,250.50");
    expect(formatPrice(64250.5, "ar")).toBe("$64,250.50");
    expect(formatPrice(64250.5, "uz")).toBe(`$64${NBSP}250,50`);
  });

  it("uses 4 fraction digits between 0.01 and 1", () => {
    expect(formatPrice(0.5, "en")).toBe("$0.5000");
    expect(formatPrice(0.01, "en")).toBe("$0.0100");
    expect(formatPrice(0.1234, "ar")).toBe("$0.1234");
    expect(formatPrice(0.1234, "uz")).toBe("$0,1234");
  });

  it("keeps up to 8 significant digits below 0.01 without trailing zeros", () => {
    expect(formatPrice(0.00001234, "en")).toBe("$0.00001234");
    expect(formatPrice(0.001, "en")).toBe("$0.001");
    expect(formatPrice(0.000012345678912, "en")).toBe("$0.000012345679");
    expect(formatPrice(0.00001234, "ar")).toBe("$0.00001234");
    expect(formatPrice(0.00001234, "uz")).toBe("$0,00001234");
  });

  it("formats zero, negatives and very large values", () => {
    expect(formatPrice(0, "en")).toBe("$0.00");
    expect(formatPrice(-12.5, "en")).toBe("-$12.50");
    expect(formatPrice(-12.5, "ar")).toBe("-$12.50");
    expect(formatPrice(-12.5, "uz")).toBe("-$12,50");
    expect(formatPrice(-0.5, "en")).toBe("-$0.5000");
    expect(formatPrice(1_234_567_890.126, "en")).toBe("$1,234,567,890.13");
    expect(formatPrice(1e15, "en")).toBe("$1,000,000,000,000,000.00");
    expect(formatPrice(1e15, "uz")).toBe(`$1${NBSP}000${NBSP}000${NBSP}000${NBSP}000${NBSP}000,00`);
  });
});

describe("formatPercent", () => {
  it("treats the input as a percentage and always signs non-zero values", () => {
    expect(formatPercent(2.5, "en")).toBe("+2.50%");
    expect(formatPercent(-1.2, "en")).toBe("-1.20%");
    expect(formatPercent(2.5, "ar")).toBe("+2.50%");
    expect(formatPercent(-1.2, "ar")).toBe("-1.20%");
    expect(formatPercent(2.5, "uz")).toBe("+2,50%");
    expect(formatPercent(-1.2, "uz")).toBe("-1,20%");
  });

  it("shows zero without a sign and handles large moves", () => {
    expect(formatPercent(0, "en")).toBe("0.00%");
    expect(formatPercent(12345.678, "en")).toBe("+12,345.68%");
    expect(formatPercent(12345.678, "uz")).toBe(`+12${NBSP}345,68%`);
  });
});

describe("formatPercentUnsigned", () => {
  it("shows one fraction digit and no sign", () => {
    expect(formatPercentUnsigned(54.23, "en")).toBe("54.2%");
    expect(formatPercentUnsigned(54.25, "en")).toBe("54.3%");
    expect(formatPercentUnsigned(12.1, "ar")).toBe("12.1%");
    expect(formatPercentUnsigned(12.1, "uz")).toBe("12,1%");
  });

  it("pads to one digit, never signs, and handles the bounds", () => {
    expect(formatPercentUnsigned(0, "en")).toBe("0.0%");
    expect(formatPercentUnsigned(100, "en")).toBe("100.0%");
    expect(formatPercentUnsigned(7, "uz")).toBe("7,0%");
    expect(formatPercentUnsigned(-3.21, "en")).toBe("3.2%");
  });
});

describe("formatCompactCurrency", () => {
  it("uses compact notation with per-locale suffixes", () => {
    expect(formatCompactCurrency(1_234_567_890_123, "en")).toBe("$1.23T");
    expect(formatCompactCurrency(45_600_000_000, "en")).toBe("$45.6B");
    expect(formatCompactCurrency(1_234_567_890_123, "ar")).toBe("$1.23 تريليون");
    expect(formatCompactCurrency(1_234_567_890_123, "uz")).toBe("$1,23 trln");
  });

  it.each([
    [12_300, "$12.3K", "$12.3 ألف", "$12,3 ming"],
    [4_560_000, "$4.56M", "$4.56 مليون", "$4,56 mln"],
    [45_600_000_000, "$45.6B", "$45.6 مليار", "$45,6 mlrd"],
  ])("maps the suffix of %s by magnitude", (value, en, ar, uz) => {
    expect(formatCompactCurrency(value, "en")).toBe(en);
    expect(formatCompactCurrency(value, "ar")).toBe(ar);
    expect(formatCompactCurrency(value, "uz")).toBe(uz);
  });

  it("formats zero, negatives, small and huge values", () => {
    expect(formatCompactCurrency(0, "en")).toBe("$0");
    expect(formatCompactCurrency(-45_600_000_000, "en")).toBe("-$45.6B");
    expect(formatCompactCurrency(-45_600_000_000, "uz")).toBe("-$45,6 mlrd");
    expect(formatCompactCurrency(999, "en")).toBe("$999");
    // en-US has no unit above trillion, so 1e15 stays "1000T".
    expect(formatCompactCurrency(1e15, "en")).toBe("$1000T");
    expect(formatCompactCurrency(1e15, "uz")).toBe("$1000 trln");
  });
});

describe("non-finite input", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "%s renders an em dash in every formatter and locale",
    (value) => {
      for (const locale of locales) {
        for (const fn of formatters) expect(fn(value, locale)).toBe(NOT_A_NUMBER);
      }
    },
  );
});

describe("runtime independence", () => {
  const values = [0, -1.2, 0.00001234, 0.5, 64250.5, 1_234_567_890_123, 1e15, -45_600_000_000];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only ever constructs Intl.NumberFormat with en-US", () => {
    const Original = Intl.NumberFormat;
    const spy = vi.spyOn(Intl, "NumberFormat").mockImplementation(function (locale, options) {
      return new Original(locale, options);
    } as typeof Intl.NumberFormat);

    for (const locale of locales) {
      for (const fn of formatters) for (const value of values) fn(value, locale);
    }

    expect(spy).toHaveBeenCalled();
    for (const [locale] of spy.mock.calls) expect(locale).toBe("en-US");
  });

  it.each([...locales])("%s output has no bidi controls or Arabic-Indic digits", (locale) => {
    for (const fn of formatters) {
      for (const value of values) {
        const output = fn(value, locale);
        expect(output).not.toMatch(BIDI_CONTROLS);
        expect(output).not.toMatch(ARABIC_INDIC_DIGITS);
        expect(output).toMatch(/[0-9]/);
      }
    }
  });

  it.each([...locales])("%s shows a plain $ prefix and never US$", (locale: Locale) => {
    for (const value of [0, 0.00001234, 0.5, 64250.5]) {
      expect(formatPrice(value, locale).startsWith("$")).toBe(true);
      expect(formatCompactCurrency(value * 1e9, locale).startsWith("$")).toBe(true);
      expect(formatPrice(-value - 1, locale).startsWith("-$")).toBe(true);
      expect(formatPrice(value, locale)).not.toContain("US$");
    }
  });
});
