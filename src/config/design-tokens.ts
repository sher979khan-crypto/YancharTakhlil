// Token names only. The values live in src/app/globals.css (the single source of raw colors).

export const colorTokens = [
  "bg",
  "surface-1",
  "surface-2",
  "surface-3",
  "line",
  "fg",
  "fg-muted",
  "fg-subtle",
  "brand",
  "brand-fg",
  "up",
  "down",
  "cosmos",
] as const;

export type ColorToken = (typeof colorTokens)[number];

/** WCAG 2.2 AA minimums. */
export const MIN_CONTRAST = { text: 4.5, large: 3 } as const;

export const textTokens = [
  "fg",
  "fg-muted",
  "fg-subtle",
  "up",
  "down",
  "brand",
  "cosmos",
] as const satisfies readonly ColorToken[];

export const textBackgrounds = [
  "bg",
  "surface-1",
  "surface-2",
] as const satisfies readonly ColorToken[];

export type ContrastPair = Readonly<{ fg: ColorToken; bg: ColorToken; min: number }>;

/** Every text/background pair components may use, each held to the normal-text minimum. */
export const contrastPairs: readonly ContrastPair[] = [
  ...textTokens.flatMap((fg) => textBackgrounds.map((bg) => ({ fg, bg, min: MIN_CONTRAST.text }))),
  { fg: "brand-fg", bg: "brand", min: MIN_CONTRAST.text },
];

const COLOR_DECLARATION = /--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi;

/** Reads `--color-<name>: #rrggbb;` declarations from a stylesheet. */
export function parseColorTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of css.matchAll(COLOR_DECLARATION)) {
    if (name && value) tokens.set(name, value.toLowerCase());
  }
  return tokens;
}
