// WCAG 2.2 contrast math (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).

export type Rgb = readonly [r: number, g: number, b: number];

const HEX = /^#([0-9a-f]{6})$/i;

export function parseHex(hex: string): Rgb {
  const match = HEX.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Expected a #rrggbb color, got "${hex}"`);
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composites `top` at `alpha` over an opaque `bottom`, like `bg-up/10` over a surface. */
export function blend(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  const mix = (t: number, b: number) => Math.round(t * alpha + b * (1 - alpha));
  return [mix(top[0], bottom[0]), mix(top[1], bottom[1]), mix(top[2], bottom[2])];
}

export type Layer = Readonly<{ color: Rgb; alpha: number }>;

/** Alpha-composites translucent layers, listed bottom to top, over an opaque base. */
export function composite(base: Rgb, layers: readonly Layer[]): Rgb {
  return layers.reduce((under, { color, alpha }) => blend(color, under, alpha), base);
}

/** The brighter of two colors by relative luminance (the harder background for light text). */
export function brighter(a: Rgb, b: Rgb): Rgb {
  return relativeLuminance(b) > relativeLuminance(a) ? b : a;
}

/** Ratios are truncated, not rounded, so 4.496 never displays as a passing 4.50. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
