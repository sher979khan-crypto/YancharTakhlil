// Token names only. The values live in src/app/globals.css (the single source of raw colors).

import { brighter, composite, parseHex, type Rgb } from "@/lib/utils/contrast";

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
  "ice",
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
  "ice",
] as const satisfies readonly ColorToken[];

export type TextToken = (typeof textTokens)[number];

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

/** Tinted fills (Badge, DemoBanner) are this share of their tone over whatever is behind. */
export const TINT_ALPHA = { badge: 0.12, banner: 0.1 } as const;

const COLOR_DECLARATION = /--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi;

/** Reads `--color-<name>: #rrggbb;` declarations from a stylesheet. */
export function parseColorTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of css.matchAll(COLOR_DECLARATION)) {
    if (name && value) tokens.set(name, value.toLowerCase());
  }
  return tokens;
}

// ---------------------------------------------------------------------------------------------
// Translucent tokens ("glass", page glows, grid). globals.css writes each one as
// `color-mix(in srgb, <base> <n>%, transparent)`, which is plain alpha over whatever is behind.

export const mixTokens = [
  "glass-fill",
  "glass-fill-strong",
  "glass-border",
  "glass-border-strong",
  "glass-highlight",
  "page-glow-ice",
  "page-glow-brand",
  "grid-line",
] as const;

export type MixToken = (typeof mixTokens)[number];

/** `base` is a color token name, "white", or a resolved #rrggbb (live computed styles). */
export type Mix = Readonly<{ base: string; alpha: number }>;

const MIX_VALUE =
  /^color-mix\(\s*in srgb,\s*(?:var\(--color-([a-z0-9-]+)\)|(white)|(#[0-9a-f]{6}))\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/i;

/** Parses one `color-mix(in srgb, <base> <n>%, transparent)` value, or returns null. */
export function parseMixValue(value: string): Mix | null {
  const match = MIX_VALUE.exec(value.trim());
  if (!match) return null;
  const [, token, white, hex, percent] = match;
  const base = token ?? white?.toLowerCase() ?? hex?.toLowerCase();
  if (!base || !percent) return null;
  return { base, alpha: Number(percent) / 100 };
}

const MIX_DECLARATION = /--([a-z0-9-]+):\s*(color-mix\([^;]*\))\s*;/gi;

/** Reads every `--<name>: color-mix(...)` declaration (the `--color-` prefix is dropped). */
export function parseMixTokens(css: string): Map<string, Mix> {
  const tokens = new Map<string, Mix>();
  for (const [, rawName, value] of css.matchAll(MIX_DECLARATION)) {
    const mix = value ? parseMixValue(value) : null;
    if (rawName && mix) tokens.set(rawName.replace(/^color-/, ""), mix);
  }
  return tokens;
}

const BLUR_DECLARATION = /--blur-([a-z0-9-]+):\s*(\d+(?:\.\d+)?)px\s*;/gi;

/** Reads `--blur-<name>: <n>px;` declarations. */
export function parseBlurTokens(css: string): Map<string, number> {
  const tokens = new Map<string, number>();
  for (const [, name, px] of css.matchAll(BLUR_DECLARATION)) {
    if (name && px) tokens.set(name, Number(px));
  }
  return tokens;
}

export type GlassStrength = "default" | "strong";

const glassFillToken: Record<GlassStrength, MixToken> = {
  default: "glass-fill",
  strong: "glass-fill-strong",
};

/** Resolved token values, from globals.css (tests) or from live computed styles (styleguide). */
export type TokenValues = Readonly<{
  color: (name: ColorToken) => Rgb;
  mix: (name: MixToken) => Mix;
  /** The smallest backdrop blur any glass uses (the mobile value), in px. */
  minBlurPx: number;
}>;

const WHITE: Rgb = [255, 255, 255];

function layer(values: TokenValues, name: MixToken, alphaScale = 1) {
  const { base, alpha } = values.mix(name);
  const color =
    base === "white"
      ? WHITE
      : base.startsWith("#")
        ? parseHex(base)
        : values.color(base as ColorToken);
  return { color, alpha: alpha * alphaScale };
}

/** Page background at the peak of each glow, before the grid. */
function glowPeaks(values: TokenValues): Rgb[] {
  const bg = values.color("bg");
  return [
    composite(bg, [layer(values, "page-glow-ice")]),
    composite(bg, [layer(values, "page-glow-brand")]),
  ];
}

/**
 * The brightest spot text can sit on directly on the page: a glow peak with a (sharp) grid line
 * running through it.
 */
export function brightestPageBackground(values: TokenValues): Rgb {
  return glowPeaks(values)
    .map((peak) => composite(peak, [layer(values, "grid-line")]))
    .reduce(brighter);
}

/**
 * Peak alpha of a 1px grid line after a Gaussian blur of `sigma` px (CSS blur() takes the
 * standard deviation): the line's area spreads to 1 / (sigma * sqrt(2 * pi)). Doubled for the
 * crossing of a horizontal and a vertical line.
 */
export function blurredLineAlpha(sigma: number): number {
  return Math.min(1, 2 / (sigma * Math.sqrt(2 * Math.PI)));
}

/** The brightest backdrop behind glass: a glow peak plus the blurred grid. */
export function brightestGlassBackdrop(values: TokenValues): Rgb {
  const grid = layer(values, "grid-line", blurredLineAlpha(values.minBlurPx));
  return glowPeaks(values)
    .map((peak) => composite(peak, [grid]))
    .reduce(brighter);
}

/**
 * The color text actually sits on inside glass: the fill and the sheen at its peak (top edge)
 * over the brightest backdrop. Without backdrop-filter or with reduced transparency the glass is
 * solid surface-1 / surface-2, which the plain surface pairs already cover.
 */
export function blendedGlass(values: TokenValues, strength: GlassStrength): Rgb {
  return composite(brightestGlassBackdrop(values), [
    layer(values, glassFillToken[strength]),
    layer(values, "glass-highlight"),
  ]);
}

export type BlendedBackground = Readonly<{ name: string; rgb: Rgb }>;

/** Translucent backgrounds text may sit on, each at its brightest. */
export function blendedBackgrounds(values: TokenValues): BlendedBackground[] {
  return [
    { name: "page at glow peak", rgb: brightestPageBackground(values) },
    { name: "glass", rgb: blendedGlass(values, "default") },
    { name: "glass strong", rgb: blendedGlass(values, "strong") },
  ];
}
