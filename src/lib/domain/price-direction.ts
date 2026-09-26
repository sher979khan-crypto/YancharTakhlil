export type PriceDirection = "up" | "down" | "neutral";

/**
 * Direction of a change as it will be displayed: the value is rounded to the shown precision
 * first, so +0.001% (shown as "0.00%") is neutral and never gets an up arrow.
 */
export function getPriceDirection(change: number, fractionDigits: number): PriceDirection {
  if (!Number.isFinite(change)) return "neutral";
  // toFixed rounds the exact binary value like Intl.NumberFormat does, unlike Math.round.
  const shown = Number(change.toFixed(fractionDigits));
  if (shown > 0) return "up";
  if (shown < 0) return "down";
  return "neutral";
}

/** Direction of a live value between two updates (no rounding: any move counts). */
export function getMoveDirection(previous: number, next: number): PriceDirection {
  if (next > previous) return "up";
  if (next < previous) return "down";
  return "neutral";
}
