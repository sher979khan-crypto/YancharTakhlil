import "server-only";

import type { Locale } from "@/lib/i18n/config";

/*
 * A cheap check that an answer is written in the page language. Free models sometimes answer in
 * English (or Russian, or Uzbek Cyrillic) whatever the prompt says, and a wrong-language answer
 * must go to the next model like any other invalid answer.
 *
 * - ar: at least 60% of the letters are Arabic script (Latin tickers and "RSI" are allowed).
 * - en / uz: at least 90% of the letters are Latin script (Uzbek must be the Latin alphabet),
 *   and the words decide between the two: Uzbek markers must outnumber English stopwords for uz,
 *   and the reverse for en.
 */

export const MIN_ARABIC_LETTER_SHARE = 0.6;
export const MIN_LATIN_LETTER_SHARE = 0.9;

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
// A word keeps its apostrophes, so "oʻrtacha" stays one word; look-alikes of ʻ are normalized.
const WORD = /[\p{L}\p{M}ʻʼ'‘’`]+/gu;
const APOSTROPHE_LIKE = /['‘’`]/g;
/** oʻ / gʻ (also typed with a look-alike apostrophe): letters only Uzbek Latin has. */
const UZBEK_LETTER = /[og]ʻ/;

export type LanguageSignals = {
  letters: number;
  arabicShare: number;
  latinShare: number;
  uzbekMarkers: number;
  englishStopwords: number;
};

export function languageSignals(text: string): LanguageSignals {
  let letters = 0;
  let arabic = 0;
  let latin = 0;
  for (const char of text) {
    if (!LETTER.test(char)) continue;
    letters += 1;
    if (ARABIC.test(char)) arabic += 1;
    else if (LATIN.test(char)) latin += 1;
  }

  let uzbekMarkers = 0;
  let englishStopwords = 0;
  for (const [raw] of text.matchAll(WORD)) {
    const word = raw.toLowerCase().replace(APOSTROPHE_LIKE, "ʻ");
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
    uzbekMarkers,
    englishStopwords,
  };
}

/** True when the texts, taken together, read as `locale`. */
export function isWrittenIn(texts: readonly string[], locale: Locale): boolean {
  const signals = languageSignals(texts.join("\n"));
  if (signals.letters === 0) return false;
  if (locale === "ar") return signals.arabicShare >= MIN_ARABIC_LETTER_SHARE;
  if (signals.latinShare < MIN_LATIN_LETTER_SHARE) return false;
  return locale === "uz"
    ? signals.uzbekMarkers > signals.englishStopwords
    : signals.englishStopwords > signals.uzbekMarkers;
}
