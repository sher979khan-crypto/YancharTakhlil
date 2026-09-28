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

  it.each([
    ["en", "The trend is up and the price is above the 限制 average."],
    ["uz", "Narx oʻrtachadan yuqori va 可能存在 xavf bor."],
    ["ar", "الاتجاه صاعد والسعر أعلى من المتوسط 可能存在 مخاطر."],
    ["ar", "الاتجاه صاعد والسعر أعلى من المتوسط ひらがな."],
    ["ar", "الاتجاه صاعد والسعر أعلى من المتوسط カタカナ."],
    ["uz", "Narx oʻrtachadan yuqori va 한국어 xavf bor."],
  ] as const)("rejects any CJK character in %s: %j", (locale, text) => {
    expect(isWrittenIn([text], locale)).toBe(false);
  });

  it("keeps Latin words in Arabic at or under 15% of all words", () => {
    // 10 words, 1 Latin word ("trading") = 10%.
    const oneIn10 = "الاتجاه صاعد والسعر أعلى من المتوسط مع زخم trading جيد";
    expect(languageSignals(oneIn10)).toMatchObject({ words: 10, latinWords: 1 });
    expect(isWrittenIn([oneIn10], "ar")).toBe(true);
    // 10 words, 2 Latin words = 20%: still > 60% Arabic letters, but rejected.
    const twoIn10 = "الاتجاه صاعد والسعر أعلى من المتوسط مع positioning trading جيد";
    expect(languageSignals(twoIn10).arabicShare).toBeGreaterThan(0.6);
    expect(isWrittenIn([twoIn10], "ar")).toBe(false);
  });

  it("does not count tickers, indicator names or the coin's own words as Latin words in Arabic", () => {
    const text =
      "يشير مؤشر RSI ومتوسط SMA وخط sma50 إلى زخم متوازن، والسعر بعيد عن ATH وأعلى من ATL، " +
      "ويتحرك مع BTC و ETH مقابل USD، وعملة Sky برمز SKY مستقرة نسبيًا في السوق الحالية";
    const sky = { name: "Sky", symbol: "sky" };
    expect(languageSignals(text, sky).latinWords).toBe(0);
    expect(isWrittenIn([text], "ar", sky)).toBe(true);
    // Without the coin, "Sky" and "SKY" are ordinary Latin words ...
    expect(languageSignals(text).latinWords).toBe(2);
    // ... and a multi-word name is allowed word by word.
    const shiba = { name: "Shiba Inu", symbol: "shib" };
    expect(languageSignals("عملة Shiba Inu أو SHIB", shiba).latinWords).toBe(0);
  });

  it("rejects text without letters", () => {
    expect(isWrittenIn(["+1.55% $95,762.90"], "en")).toBe(false);
    expect(isWrittenIn([], "ar")).toBe(false);
  });
});
