// Pure helpers for the price chart. Typed structurally, so this file never imports the chart
// library (which would pull it into every bundle that imports these helpers).

/** A chart time as lightweight-charts hands it back: a "YYYY-MM-DD" string, a business day or seconds. */
export type ChartTime = string | number | { year: number; month: number; day: number };

/** Turns any chart time back into "YYYY-MM-DD" (UTC). */
export function chartTimeToIsoDate(time: ChartTime): string {
  if (typeof time === "string") return time;
  if (typeof time === "number") return new Date(time * 1000).toISOString().slice(0, 10);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
}

/**
 * Smallest price step the axis should resolve: four significant digits below the lowest price,
 * so a $0.00000981 coin does not collapse into a flat line at the default 0.01.
 */
export function priceMinMove(lowestPrice: number): number {
  if (!(lowestPrice > 0) || !Number.isFinite(lowestPrice)) return 0.01;
  const exponent = Math.floor(Math.log10(lowestPrice)) - 3;
  // Never coarser than a cent, which is what formatPrice shows for prices >= $1.
  return Math.min(0.01, Number(`1e${exponent}`));
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * "#7fe3ff" + 0.3 -> "rgba(127, 227, 255, 0.3)". The chart draws on a canvas and needs a color
 * string with alpha; the tokens are hex. Anything else is returned unchanged (alpha ignored).
 */
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim();
  const match = HEX_COLOR.exec(value);
  if (!match?.[1]) return value;
  const hex =
    match[1].length === 3 ? Array.from(match[1], (digit) => digit + digit).join("") : match[1];
  const channel = (index: number) => Number.parseInt(hex.slice(index, index + 2), 16);
  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${alpha})`;
}

/**
 * Canvas labels inherit the chart's LTR direction, which scrambles an RTL date: in
 * "11 سبتمبر 2026" the year joins the Arabic run. An RTL isolate (U+2067 ... U+2069) keeps the
 * label in reading order. Only for canvas text: HTML uses <bdi dir> instead.
 */
export function isolateForCanvas(text: string, dir: "ltr" | "rtl"): string {
  return dir === "rtl" ? `\u2067${text}\u2069` : text;
}
