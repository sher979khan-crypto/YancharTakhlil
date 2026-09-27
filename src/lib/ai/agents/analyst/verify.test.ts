import { beforeAll, describe, expect, it } from "vitest";

import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import type { Locale } from "@/lib/i18n/config";

import {
  bitcoinInput,
  VALID_AR_ANSWER,
  VALID_EN_ANSWER,
  VALID_UZ_ANSWER,
} from "./__fixtures__/analyst-fixtures";
import { buildDisplay } from "./display";
import {
  buildAllowedNumbers,
  extractNumberTokens,
  findInventedNumbers,
  isInvalidationOnCorrectSide,
  signalAgreesWithReasons,
  verifyOutputNumbers,
  type AllowedNumbers,
} from "./verify";

let input: AnalysisInput;
const allowedFor: Partial<Record<Locale, AllowedNumbers>> = {};

beforeAll(async () => {
  input = await bitcoinInput();
  for (const locale of ["en", "ar", "uz"] as const) {
    allowedFor[locale] = buildAllowedNumbers(input, buildDisplay(input, locale), locale);
  }
});

function invented(text: string, locale: Locale): string[] {
  const allowed = allowedFor[locale];
  if (!allowed) throw new Error("allowed numbers not built");
  return findInventedNumbers(text, allowed);
}

describe("extractNumberTokens", () => {
  it("reads signs, currency, groups, decimals and compact suffixes", () => {
    const tokens = extractNumberTokens("From -$1,234.50 to +2.35% and $1.94T, then 38,4 mlrd.");
    expect(
      tokens.map((token) => [token.raw, token.negative, token.body, token.multiplier]),
    ).toEqual([
      ["-$1,234.50", true, "1,234.50", 1],
      ["+2.35", false, "2.35", 1],
      ["$1.94T", false, "1.94", 1e12],
      ["38,4 mlrd", false, "38,4", 1e9],
    ]);
  });

  it("does not treat a hyphen after a word as a minus sign", () => {
    expect(extractNumberTokens("RSI-14 and 20-day").map((token) => token.negative)).toEqual([
      false,
      false,
    ]);
  });

  it("reads uz no-break-space groups and a plain space before three digits", () => {
    const tokens = extractNumberTokens("$96 279,80 va $95 762,90");
    expect(tokens.map((token) => token.body)).toEqual(["96 279,80", "95 762,90"]);
  });

  it("reads digits glued to letters", () => {
    expect(extractNumberTokens("sma20 و5%").map((token) => token.body)).toEqual(["20", "5"]);
  });

  it("reads Arabic compact words", () => {
    const [token] = extractNumberTokens("$1.94 تريليون");
    expect(token?.multiplier).toBe(1e12);
  });
});

describe("findInventedNumbers (en)", () => {
  it("accepts the whole valid answer", () => {
    const allowed = allowedFor.en;
    if (!allowed) throw new Error("allowed numbers not built");
    expect(verifyOutputNumbers(VALID_EN_ANSWER, allowed)).toEqual([]);
  });

  it.each([
    "The price is $97,250.00 and RSI is 51.68.",
    "Price 97250 is above sma50.",
    "The market cap is $1.94T with $38.4B traded.",
    "Over 7, 14, 30 and 90 days the 24h change was +1.84%.",
    "Volatility is 2.0% and dominance 56.7% (raw 56.67).",
    "It trades 22.87% below its peak.",
  ])("accepts %j", (text) => {
    expect(invented(text, "en")).toEqual([]);
  });

  it.each([
    ["a made-up price target", "A target of $110,000.00 is possible.", ["$110,000.00"]],
    ["a rounded number", "RSI is about 52.", ["52"]],
    ["a flipped sign", "The 24h change was -1.84%.", ["-1.84"]],
    ["a date", "Since 2025 the trend is up.", ["2025"]],
    ["a wrong compact size", "Market cap is $2T.", ["$2T"]],
    ["a guidance number", "RSI between 40 and 70 supports this.", ["40", "70"]],
  ])("rejects %s", (_label, text, tokens) => {
    expect(invented(text, "en")).toEqual(tokens);
  });

  it("rejects numbers written in non-Latin digits", () => {
    expect(invented("RSI is ٥١.٦٨", "en")).toEqual(["٥"]);
  });
});

describe("findInventedNumbers (uz)", () => {
  it("accepts the whole valid answer", () => {
    const allowed = allowedFor.uz;
    if (!allowed) throw new Error("allowed numbers not built");
    expect(verifyOutputNumbers(VALID_UZ_ANSWER, allowed)).toEqual([]);
  });

  it("accepts the en notation in uz text as well", () => {
    expect(invented("RSI 51.68, narx $97,250.00.", "uz")).toEqual([]);
  });

  it.each([
    ["an invented price", "Narx $99 000,00 gacha koʻtarilishi mumkin.", ["$99 000,00"]],
    ["an invented size", "Kapitallashuv $2,5 trln.", ["$2,5 trln"]],
    ["an invented percentage", "Narx 12,5% oshdi.", ["12,5"]],
  ])("rejects %s", (_label, text, tokens) => {
    expect(invented(text, "uz")).toEqual(tokens);
  });
});

describe("findInventedNumbers (ar)", () => {
  it("accepts the whole valid answer", () => {
    const allowed = allowedFor.ar;
    if (!allowed) throw new Error("allowed numbers not built");
    expect(verifyOutputNumbers(VALID_AR_ANSWER, allowed)).toEqual([]);
  });

  it.each([
    ["an invented target", "قد يصل السعر إلى $120,000.00.", ["$120,000.00"]],
    ["an invented size", "حجم التداول $50 مليار.", ["$50 مليار"]],
    ["a number glued to a prefix", "وارتفع و15% خلال أسبوع.", ["15"]],
    ["Arabic-Indic digits", "مؤشر القوة النسبية ٥١", ["٥"]],
  ])("rejects %s", (_label, text, tokens) => {
    expect(invented(text, "ar")).toEqual(tokens);
  });
});

describe("isInvalidationOnCorrectSide", () => {
  const at = (metric: "indicators.sma50" | "indicators.high30d") => ({
    invalidation: { metric, text: "x" },
  });

  it("wants a level below the price for BUY and above it for SELL", () => {
    // sma50 $95,762.90 < price $97,250 < high30d $101,807
    expect(isInvalidationOnCorrectSide("BUY", input, at("indicators.sma50"))).toBe(true);
    expect(isInvalidationOnCorrectSide("BUY", input, at("indicators.high30d"))).toBe(false);
    expect(isInvalidationOnCorrectSide("SELL", input, at("indicators.high30d"))).toBe(true);
    expect(isInvalidationOnCorrectSide("SELL", input, at("indicators.sma50"))).toBe(false);
  });

  it("accepts either side for HOLD but never an unknown level", () => {
    expect(isInvalidationOnCorrectSide("HOLD", input, at("indicators.sma50"))).toBe(true);
    expect(isInvalidationOnCorrectSide("HOLD", input, at("indicators.high30d"))).toBe(true);
    const noSma = { ...input, indicators: { ...input.indicators, sma50: null } };
    expect(isInvalidationOnCorrectSide("HOLD", noSma, at("indicators.sma50"))).toBe(false);
  });
});

describe("signalAgreesWithReasons", () => {
  const reasons = (...stances: ("bullish" | "bearish" | "neutral")[]) =>
    stances.map((stance) => ({ metric: "indicators.rsi14" as const, stance, text: "x" }));

  it.each([
    ["BUY", ["bullish", "bullish", "bearish"], true],
    ["BUY", ["bullish", "bearish"], true],
    ["BUY", ["bearish", "bearish", "bullish"], false],
    ["SELL", ["bearish", "neutral"], true],
    ["SELL", ["bullish", "bullish", "bearish"], false],
    ["HOLD", ["bullish", "bearish"], true],
    ["HOLD", ["neutral", "neutral"], true],
    ["HOLD", ["bullish", "bullish"], false],
  ] as const)("%s with %j -> %s", (signal, stances, expected) => {
    expect(signalAgreesWithReasons({ signal, reasons: reasons(...stances) })).toBe(expected);
  });
});
