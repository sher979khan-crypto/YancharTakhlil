import { describe, expect, it } from "vitest";

import { VALID_AR_ANSWER, VALID_EN_ANSWER, VALID_UZ_ANSWER } from "./__fixtures__/analyst-fixtures";
import { isWrittenIn, languageSignals } from "./verify-language";
import { outputTexts } from "./verify";

const EN = outputTexts(VALID_EN_ANSWER);
const UZ = outputTexts(VALID_UZ_ANSWER);
const AR = outputTexts(VALID_AR_ANSWER);

describe("isWrittenIn", () => {
  it("accepts each fixture answer in its own language only", () => {
    expect(isWrittenIn(EN, "en")).toBe(true);
    expect(isWrittenIn(EN, "uz")).toBe(false);
    expect(isWrittenIn(EN, "ar")).toBe(false);

    expect(isWrittenIn(UZ, "uz")).toBe(true);
    expect(isWrittenIn(UZ, "en")).toBe(false);
    expect(isWrittenIn(UZ, "ar")).toBe(false);

    expect(isWrittenIn(AR, "ar")).toBe(true);
    expect(isWrittenIn(AR, "en")).toBe(false);
    expect(isWrittenIn(AR, "uz")).toBe(false);
  });

  it("allows Latin tickers and indicator names inside Arabic text", () => {
    expect(isWrittenIn(["مؤشر RSI عند 51.68 وسعر BTC أعلى من متوسط SMA 50."], "ar")).toBe(true);
    // Mostly English with a few Arabic words is not Arabic.
    expect(isWrittenIn(["The trend is up and the price is above the average مؤشر."], "ar")).toBe(
      false,
    );
  });

  it("rejects Uzbek written in Cyrillic, or with Cyrillic mixed in", () => {
    expect(isWrittenIn(["Нарх 50 кунлик ўртачадан юқори ва тренд юқорига."], "uz")).toBe(false);
    expect(isWrittenIn(["Narx yuqori va тренд юқорига қараб кетмоқда."], "uz")).toBe(false);
  });

  it("counts oʻ / gʻ typed with a look-alike apostrophe as Uzbek", () => {
    expect(languageSignals("o'rtacha oraligʻi").uzbekMarkers).toBe(2);
    expect(isWrittenIn(["Narx o'rtachadan yuqori."], "uz")).toBe(true);
  });

  it("does not take English -ing words for Uzbek", () => {
    const text = "Momentum is declining while volume is gaining; a warning for the price.";
    expect(languageSignals(text).uzbekMarkers).toBe(0);
    expect(isWrittenIn([text], "en")).toBe(true);
  });

  it("rejects text without letters", () => {
    expect(isWrittenIn(["+1.55% $95,762.90"], "en")).toBe(false);
    expect(isWrittenIn([], "ar")).toBe(false);
  });
});
