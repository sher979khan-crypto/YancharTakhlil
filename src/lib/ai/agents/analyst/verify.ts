import "server-only";

import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import { collectNumbers } from "@/lib/ai/analyst/collect-numbers";
import type { Signal } from "@/lib/api/contract";
import type { Locale } from "@/lib/i18n/config";

import type { AnalysisDisplay } from "./display";
import { readLevel } from "./metrics";
import type { AnalystOutput } from "./output-schema";

/**
 * Periods and bounds the text may name without them being data ("the 7-day change", "RSI 14"),
 * and the RSI reference thresholds (30, 40, 60, 70, 80) that system prompt rule 7 names in words.
 */
export const NEUTRAL_NUMBERS: readonly number[] = [
  1, 7, 14, 20, 24, 30, 40, 50, 60, 70, 80, 90, 100,
];

const SUFFIX_MULTIPLIERS: Readonly<Record<string, number>> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
  ming: 1e3,
  mln: 1e6,
  mlrd: 1e9,
  trln: 1e12,
  ألف: 1e3,
  مليون: 1e6,
  مليار: 1e9,
  تريليون: 1e12,
};

/**
 * A number as the model or format.ts may write it: optional sign (only when it does not follow a
 * letter or digit, so "RSI-14" is 14, not -14), optional "$", digits with "," "." or no-break-space
 * groups and a decimal part (a plain space only before exactly three digits, as in "63 421,50"),
 * then an optional compact suffix. Digits right after a letter still count ("sma20" is 20), so a
 * number glued to an Arabic prefix such as "و" cannot slip through.
 */
const NUMBER_TOKEN =
  /(?<![\p{N}.,])(?:(?<![\p{L}\p{N}])([-+−])\s?)?(?:\$\s?)?(\d+(?:(?:[.,  ]| (?=\d{3}(?!\d)))\d+)*)(?:(K|M|B|T)(?![\p{L}\p{N}])|\s?(ming|mln|mlrd|trln|ألف|مليون|مليار|تريليون)(?![\p{L}\p{N}]))?/gu;

/** Any decimal digit other than 0-9 (Arabic-Indic, Persian, fullwidth...). */
const NON_LATIN_DIGIT = /(?![0-9])\p{Nd}/u;

type NumberToken = { raw: string; negative: boolean; body: string; multiplier: number };

/**
 * What may sit between the first number of a range and a "-" that joins it to the second: an
 * optional "%", then either nothing ("40%-70%") or spaces on both sides of the dash ("40 - 70").
 * "40-70" and "40–70" never read as a minus (the "-" follows a digit; "–" is not a sign), and
 * "40 to 70" has no sign at all. "51.68 -1.84%" (a space only before the dash) stays negative.
 */
const RANGE_GAP = /^%?(\s*)$/;

function isRangeDash(text: string, previousEnd: number, match: RegExpExecArray): boolean {
  const [raw, sign] = match;
  if (sign !== "-") return false;
  const gap = RANGE_GAP.exec(text.slice(previousEnd, match.index));
  if (!gap) return false;
  const spaceBefore = (gap[1] ?? "").length > 0;
  const spaceAfter = /^-\s/.test(raw);
  return spaceBefore === spaceAfter;
}

export function extractNumberTokens(text: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  let previousEnd: number | null = null;
  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const [raw, sign, body = "", shortSuffix, wordSuffix] = match;
    const suffix = shortSuffix ?? wordSuffix;
    const rangeDash = previousEnd !== null && isRangeDash(text, previousEnd, match);
    tokens.push({
      raw: raw.trim(),
      negative: !rangeDash && (sign === "-" || sign === "−"),
      body,
      multiplier: suffix ? (SUFFIX_MULTIPLIERS[suffix] ?? 1) : 1,
    });
    previousEnd = match.index + raw.length;
  }
  return tokens;
}

/** "." decimal with "," groups (en, ar) or "," decimal with "." groups (uz); spaces are groups. */
type Notation = "dot" | "comma";

function parseBody(body: string, notation: Notation): number {
  const noSpaces = body.replace(/[   ]/g, "");
  const normalized =
    notation === "dot" ? noSpaces.replace(/,/g, "") : noSpaces.replace(/\./g, "").replace(",", ".");
  // A second decimal separator ("1.2.3") is not a number in this notation.
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function tokenValues(token: NumberToken, notations: readonly Notation[]): number[] {
  return notations
    .map((notation) => parseBody(token.body, notation) * token.multiplier)
    .filter(Number.isFinite)
    .map((value) => (token.negative ? -value : value));
}

/** Float noise from a suffix multiplier ("1.23T" -> 1229999999999.9998) must not matter. */
function numberKey(value: number): string {
  return value === 0 ? "0" : value.toPrecision(12);
}

export function localeNotation(locale: Locale): Notation {
  return locale === "uz" ? "comma" : "dot";
}

export type AllowedNumbers = ReadonlySet<string>;

/**
 * Every number the text may contain: the input's numbers (collectNumbers, incl. |x| of negatives),
 * each number written in a display string, the neutral period numbers, and digits in the coin's
 * own name or symbol.
 */
export function buildAllowedNumbers(
  input: AnalysisInput,
  display: AnalysisDisplay,
  locale: Locale,
): AllowedNumbers {
  const allowed = new Set<string>();
  const add = (value: number) => {
    allowed.add(numberKey(value));
    allowed.add(numberKey(Math.abs(value)));
  };
  collectNumbers(input).forEach(add);
  NEUTRAL_NUMBERS.forEach(add);
  for (const text of Object.values(display)) {
    for (const token of extractNumberTokens(text))
      tokenValues(token, [localeNotation(locale)]).forEach(add);
  }
  for (const token of extractNumberTokens(`${input.coin.name} ${input.coin.symbol}`)) {
    tokenValues(token, ["dot"]).forEach(add);
  }
  return allowed;
}

/**
 * The number tokens in `text` that are not allowed. The model may use either notation in any
 * language, so a token passes if one reading of it matches. A number in non-Latin digits cannot
 * be checked and is always reported.
 */
export function findInventedNumbers(text: string, allowed: AllowedNumbers): string[] {
  const invented = extractNumberTokens(text)
    .filter((token) => !tokenValues(token, ["dot", "comma"]).some((v) => allowed.has(numberKey(v))))
    .map((token) => token.raw);
  const nonLatin = NON_LATIN_DIGIT.exec(text);
  return nonLatin ? [...invented, nonLatin[0]] : invented;
}

/** Every free-text field of an answer. */
export function outputTexts(output: AnalystOutput): string[] {
  return [
    output.summary,
    ...output.reasons.map((reason) => reason.text),
    ...output.risks,
    output.invalidation.text,
  ];
}

/** Invented numbers across the whole answer (empty when every number checks out). */
export function verifyOutputNumbers(output: AnalystOutput, allowed: AllowedNumbers): string[] {
  return outputTexts(output).flatMap((text) => findInventedNumbers(text, allowed));
}

/**
 * The invalidation level must be on the side that would prove the view wrong: BUY below the
 * current price, SELL above it, HOLD either side. An unknown level never passes.
 */
export function isInvalidationOnCorrectSide(
  signal: Signal,
  input: AnalysisInput,
  output: Pick<AnalystOutput, "invalidation">,
): boolean {
  const level = readLevel(input, output.invalidation.metric);
  if (level === null) return false;
  if (signal === "BUY") return level < input.price.usd;
  if (signal === "SELL") return level > input.price.usd;
  return true;
}

/**
 * False when the signal goes against the reasons' majority stance: BUY with more bearish than
 * bullish reasons, SELL with more bullish than bearish, or HOLD with every reason on one side.
 * Only logged as a warning: a balanced answer may legitimately lean the other way.
 */
export function signalAgreesWithReasons(
  output: Pick<AnalystOutput, "signal" | "reasons">,
): boolean {
  const bullish = output.reasons.filter((reason) => reason.stance === "bullish").length;
  const bearish = output.reasons.filter((reason) => reason.stance === "bearish").length;
  if (output.signal === "BUY") return bullish >= bearish;
  if (output.signal === "SELL") return bearish >= bullish;
  const total = output.reasons.length;
  return bullish < total && bearish < total;
}
