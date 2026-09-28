import { describe, expect, it } from "vitest";

import { VALID_UZ_ANSWER } from "./__fixtures__/analyst-fixtures";
import { normalizeUzbekOutput, normalizeUzbekText } from "./normalize-uzbek";

describe("normalizeUzbekText", () => {
  it.each([
    ["o'rtacha", "oʻrtacha"],
    ["o’rtacha", "oʻrtacha"],
    ["o‘rtacha", "oʻrtacha"],
    ["o`rtacha", "oʻrtacha"],
    ["O'zbekiston", "Oʻzbekiston"],
    ["oralig'i", "oraligʻi"],
    ["G'arb", "Gʻarb"],
    ["tog'", "togʻ"],
  ])("turns o/g + apostrophe into U+02BB: %j", (text, expected) => {
    expect(normalizeUzbekText(text)).toBe(expected);
  });

  it.each([
    ["ma'lumot", "maʼlumot"],
    ["ta’sir", "taʼsir"],
    ["san'at", "sanʼat"],
  ])("turns any other apostrophe between letters into U+02BC: %j", (text, expected) => {
    expect(normalizeUzbekText(text)).toBe(expected);
  });

  it("leaves text that is already correct unchanged", () => {
    const text = "Maʼlumotlarga koʻra, narx oʻrtachadan yuqori.";
    expect(normalizeUzbekText(text)).toBe(text);
  });

  it("never touches digits, $, % or an apostrophe that is not between letters", () => {
    const text = "Narx $95 762,90, oʻzgarish -2,35% va 5'10 hamda 'trend' soʻzi.";
    expect(normalizeUzbekText(text)).toBe(text);
  });
});

describe("normalizeUzbekOutput", () => {
  it("normalizes every free-text field and keeps the rest", () => {
    const output = normalizeUzbekOutput({
      ...VALID_UZ_ANSWER,
      summary: "Ma'lumotlarga ko'ra narx yuqori.",
      reasons: [
        { metric: "indicators.rsi14", stance: "neutral", text: "RSI o'rtacha zonada, 51,68 da." },
        { metric: "indicators.trend", stance: "bullish", text: "Trend yuqoriga yo'nalgan." },
      ],
      risks: ["Bozor tebranishi ko'tarilishi mumkin."],
      invalidation: { metric: "indicators.sma50", text: "Narx o'rtachadan pastga tushsa." },
    });
    expect(output.summary).toBe("Maʼlumotlarga koʻra narx yuqori.");
    expect(output.reasons.map((reason) => reason.text)).toEqual([
      "RSI oʻrtacha zonada, 51,68 da.",
      "Trend yuqoriga yoʻnalgan.",
    ]);
    expect(output.reasons.map((reason) => reason.metric)).toEqual([
      "indicators.rsi14",
      "indicators.trend",
    ]);
    expect(output.risks).toEqual(["Bozor tebranishi koʻtarilishi mumkin."]);
    expect(output.invalidation).toEqual({
      metric: "indicators.sma50",
      text: "Narx oʻrtachadan pastga tushsa.",
    });
    expect(output.signal).toBe(VALID_UZ_ANSWER.signal);
  });
});
