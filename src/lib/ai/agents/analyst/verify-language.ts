import "server-only";

import type { Locale } from "@/lib/i18n/config";

/*
 * A cheap check that an answer is written in the page language. Free models sometimes answer in
 * English (or Russian, or Uzbek Cyrillic) whatever the prompt says, and a wrong-language answer
 * must go to the next model like any other invalid answer.
 *
 * - any locale: no Han, Hiragana, Katakana or Hangul character (Step 14: free models leaked
 *   Chinese words such as "限制" into Arabic answers).
 * - ar: at least 60% of the letters are Arabic script, and Latin-script words ("trading",
 *   "positioning") are at most 15% of all words; tickers and indicator names (ARABIC_LATIN_ALLOWED,
 *   plus the coin's symbol and name words) do not count as Latin words.
 * - en / uz: at least 90% of the letters are Latin script (Uzbek must be the Latin alphabet),
 *   and the words decide between the two: Uzbek markers must outnumber English stopwords for uz,
 *   and the reverse for en.
 */

export const MIN_ARABIC_LETTER_SHARE = 0.6;
export const MAX_ARABIC_LATIN_WORD_SHARE = 0.15;
export const MIN_LATIN_LETTER_SHARE = 0.9;

/**
 * Latin words an Arabic answer may use freely (compared case-insensitively). Words are letters
 * only, so "SMA20" is read as "SMA"; the digit forms are listed as the owner specified them.
 */
export const ARABIC_LATIN_ALLOWED: ReadonlySet<string> = new Set([
  "rsi",
  "sma",
  "sma20",
  "sma50",
  "ath",
  "atl",
  "btc",
  "eth",
  "usd",
]);

/**
 * Frequent Uzbek words of this domain that are not English words. "trend", "past" (Uzbek "low")
 * and "on" are left out on purpose: they are also English.
 */
export const UZBEK_MARKER_WORDS: ReadonlySet<string> = new Set([
  "va",
  "bilan",
  "uchun",
  "boʻyicha",
  "ham",
  "esa",
  "lekin",
  "ammo",
  "yoki",
  "agar",
  "bu",
  "shu",
  "ushbu",
  "emas",
  "mumkin",
  "koʻra",
  "narx",
  "narxi",
  "narxning",
  "kun",
  "kunlik",
  "soat",
  "soatlik",
  "yuqori",
  "tahlil",
  "hajm",
  "hajmi",
  "savdo",
  "xavf",
  "darajasi",
  "boʻlsa",
  "hozir",
  "eng",
]);

/**
 * Uzbek suffixes that English words of this domain do not end with. The genitive "-ning" is left
 * out: "declining", "gaining" and "warning" end with it too.
 */
export const UZBEK_MARKER_SUFFIXES: readonly string[] = ["dagi", "lari", "larni", "dan"];

/** Function words and domain words that only an English text uses this often. */
export const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set([
  "the",
  "and",
  "is",
  "are",
  "was",
  "of",
  "with",
  "to",
  "in",
  "for",
  "from",
  "by",
  "this",
  "that",
  "its",
  "as",
  "be",
  "has",
  "have",
  "which",
  "above",
  "below",
  "while",
  "but",
  "not",
  "than",
  "could",
  "would",
  "price",
  "over",
]);

// Letters with a script: modifier letters such as the Uzbek ʻ (U+02BB, Lm) are not counted.
const LETTER = /[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]/u;
const ARABIC = /\p{Script=Arabic}/u;
const LATIN = /\p{Script=Latin}/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
// A word keeps its apostrophes, so "oʻrtacha" stays one word; look-alikes of ʻ are normalized.
const WORD = /[\p{L}\p{M}ʻʼ'‘’`]+/gu;
const APOSTROPHE_LIKE = /['‘’`]/g;
/** oʻ / gʻ (also typed with a look-alike apostrophe): letters only Uzbek Latin has. */
const UZBEK_LETTER = /[og]ʻ/;

export type LanguageSignals = {
  letters: number;
  arabicShare: number;
  latinShare: number;
  /** Han, Hiragana, Katakana or Hangul characters. */
  cjkChars: number;
  words: number;
  /** Words with a Latin letter, minus the allowed ones (ARABIC_LATIN_ALLOWED + the coin's words). */
  latinWords: number;
  uzbekMarkers: number;
  englishStopwords: number;
};

/** The coin the answer is about: its symbol and name words may appear in Latin in any locale. */
export type LanguageCoin = { name: string; symbol: string };

function allowedLatinWords(coin: LanguageCoin | undefined): ReadonlySet<string> {
  if (!coin) return ARABIC_LATIN_ALLOWED;
  const coinWords = [...`${coin.name} ${coin.symbol}`.matchAll(WORD)].map(([word]) =>
    word.toLowerCase(),
  );
  return new Set([...ARABIC_LATIN_ALLOWED, ...coinWords]);
}

export function languageSignals(text: string, coin?: LanguageCoin): LanguageSignals {
  let letters = 0;
  let arabic = 0;
  let latin = 0;
  let cjkChars = 0;
  for (const char of text) {
    if (CJK.test(char)) cjkChars += 1;
    if (!LETTER.test(char)) continue;
    letters += 1;
    if (ARABIC.test(char)) arabic += 1;
    else if (LATIN.test(char)) latin += 1;
  }

  const allowedLatin = allowedLatinWords(coin);
  let words = 0;
  let latinWords = 0;
  let uzbekMarkers = 0;
  let englishStopwords = 0;
  for (const [raw] of text.matchAll(WORD)) {
    words += 1;
    const word = raw.toLowerCase().replace(APOSTROPHE_LIKE, "ʻ");
    if (LATIN.test(word) && !allowedLatin.has(raw.toLowerCase())) latinWords += 1;
    if (ENGLISH_STOPWORDS.has(word)) englishStopwords += 1;
    else if (
      UZBEK_MARKER_WORDS.has(word) ||
      UZBEK_LETTER.test(word) ||
      UZBEK_MARKER_SUFFIXES.some(
        (suffix) => word.length > suffix.length + 1 && word.endsWith(suffix),
      )
    ) {
      uzbekMarkers += 1;
    }
  }

  return {
    letters,
    arabicShare: letters === 0 ? 0 : arabic / letters,
    latinShare: letters === 0 ? 0 : latin / letters,
    cjkChars,
    words,
    latinWords,
    uzbekMarkers,
    englishStopwords,
  };
}

/** True when the texts, taken together, read as `locale`. */
export function isWrittenIn(
  texts: readonly string[],
  locale: Locale,
  coin?: LanguageCoin,
): boolean {
  const signals = languageSignals(texts.join("\n"), coin);
  if (signals.letters === 0 || signals.cjkChars > 0) return false;
  if (locale === "ar") {
    return (
      signals.arabicShare >= MIN_ARABIC_LETTER_SHARE &&
      signals.latinWords <= MAX_ARABIC_LATIN_WORD_SHARE * signals.words
    );
  }
  if (signals.latinShare < MIN_LATIN_LETTER_SHARE) return false;
  return locale === "uz"
    ? signals.uzbekMarkers > signals.englishStopwords
    : signals.englishStopwords > signals.uzbekMarkers;
}
