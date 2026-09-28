import "server-only";

import type { AnalystOutput } from "./output-schema";

/*
 * Models often type the Uzbek tutuq belgisi with an ASCII or typographic apostrophe ("o'rtacha",
 * "ma’lumot"). The UI must show oʻ / gʻ with U+02BB and the other apostrophe with U+02BC
 * (CLAUDE.md §9), so uz answers are normalized before they are checked and returned.
 */

/** o / g followed by an apostrophe look-alike: the letters oʻ / gʻ (U+02BB). */
const O_G_APOSTROPHE = /([oOgG])['’‘`]/g;
/** Any other apostrophe between two letters: the tutuq belgisi ʼ (U+02BC), as in "maʼlumot". */
const LETTER_APOSTROPHE = /(?<=\p{L})['’](?=\p{L})/gu;

export function normalizeUzbekText(text: string): string {
  return text.replace(O_G_APOSTROPHE, "$1ʻ").replace(LETTER_APOSTROPHE, "ʼ");
}

/** Every free-text field of an answer (the fields outputTexts in verify.ts lists). */
export function normalizeUzbekOutput(output: AnalystOutput): AnalystOutput {
  return {
    ...output,
    summary: normalizeUzbekText(output.summary),
    reasons: output.reasons.map((reason) => ({ ...reason, text: normalizeUzbekText(reason.text) })),
    risks: output.risks.map(normalizeUzbekText),
    invalidation: { ...output.invalidation, text: normalizeUzbekText(output.invalidation.text) },
  };
}
