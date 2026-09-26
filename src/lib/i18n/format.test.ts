import { describe, expect, it } from "vitest";

import { locales, type Locale } from "./config";
import { formatCompactCurrency, formatPercent, formatPrice } from "./format";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;

// Intl inserts bidi marks and (for uz) narrow no-break spaces; normalize them so the
// assertions compare the visible text.
function visible(text: string): string {
  return text.replace(/[‎‏؜]/g, "").replace(/[  ]/g, " ");
}

describe("formatPrice", () => {
  it("uses 2 fraction digits for prices >= 1", () => {
    expect(formatPrice(64250.5, "en")).toBe("$64,250.50");
    expect(visible(formatPrice(64250.5, "ar"))).toBe("64,250.50 US$");
    expect(visible(formatPrice(64250.5, "uz"))).toBe("64 250,50 US$");
  });

  it("uses 4 fraction digits between 0.01 and 1", () => {
    expect(formatPrice(0.5, "en")).toBe("$0.5000");
    expect(formatPrice(0.01, "en")).toBe("$0.0100");
    expect(visible(formatPrice(0.1234, "ar"))).toBe("0.1234 US$");
    expect(visible(formatPrice(0.1234, "uz"))).toBe("0,1234 US$");
  });

  it("keeps up to 8 significant digits below 0.01 without trailing zeros", () => {
    expect(formatPrice(0.00001234, "en")).toBe("$0.00001234");
    expect(formatPrice(0.001, "en")).toBe("$0.001");
    expect(formatPrice(0.000012345678912, "en")).toBe("$0.000012345679");
    expect(visible(formatPrice(0.00001234, "ar"))).toBe("0.00001234 US$");
    expect(visible(formatPrice(0.00001234, "uz"))).toBe("0,00001234 US$");
  });

  it("formats zero, negatives and very large values", () => {
    expect(formatPrice(0, "en")).toBe("$0.00");
    expect(formatPrice(-12.5, "en")).toBe("-$12.50");
    expect(formatPrice(-0.5, "en")).toBe("-$0.5000");
    expect(formatPrice(1_234_567_890.126, "en")).toBe("$1,234,567,890.13");
  });
});

describe("formatPercent", () => {
  it("treats the input as a percentage and always signs non-zero values", () => {
    expect(formatPercent(2.5, "en")).toBe("+2.50%");
    expect(formatPercent(-1.2, "en")).toBe("-1.20%");
    expect(visible(formatPercent(2.5, "ar"))).toBe("+2.50%");
    expect(visible(formatPercent(-1.2, "ar"))).toBe("-1.20%");
    expect(visible(formatPercent(2.5, "uz"))).toBe("+2,50%");
    expect(visible(formatPercent(-1.2, "uz"))).toBe("-1,20%");
  });

  it("shows zero without a sign and handles large moves", () => {
    expect(formatPercent(0, "en")).toBe("0.00%");
    expect(formatPercent(12345.678, "en")).toBe("+12,345.68%");
  });
});

describe("formatCompactCurrency", () => {
  it("uses compact notation", () => {
    expect(formatCompactCurrency(1_234_567_890_123, "en")).toBe("$1.23T");
    expect(formatCompactCurrency(45_600_000_000, "en")).toBe("$45.6B");
    expect(visible(formatCompactCurrency(1_234_567_890_123, "ar"))).toBe("1.23 ترليون US$");
    expect(visible(formatCompactCurrency(1_234_567_890_123, "uz"))).toBe("1,23 trln US$");
  });

  it("formats zero, negatives and small values", () => {
    expect(formatCompactCurrency(0, "en")).toBe("$0");
    expect(formatCompactCurrency(-45_600_000_000, "en")).toBe("-$45.6B");
    expect(formatCompactCurrency(999, "en")).toBe("$999");
  });
});

describe("Arabic digits", () => {
  const values = [0, -1.2, 0.00001234, 0.5, 64250.5, 1_234_567_890_123];

  it.each(values)("ar output for %s uses Latin digits only", (value) => {
    for (const output of [
      formatPrice(value, "ar"),
      formatPercent(value, "ar"),
      formatCompactCurrency(value, "ar"),
    ]) {
      expect(output).not.toMatch(ARABIC_INDIC_DIGITS);
      expect(output).toMatch(/[0-9]/);
    }
  });
});

describe("all locales", () => {
  it.each([...locales])("%s produces non-empty output", (locale: Locale) => {
    expect(formatPrice(1, locale)).not.toBe("");
    expect(formatPercent(1, locale)).not.toBe("");
    expect(formatCompactCurrency(1, locale)).not.toBe("");
  });
});
