export type ReadingDirection = "ltr" | "rtl";

/**
 * Next focused index in a single-select group (radiogroup with roving tabindex), or null when the
 * key is not handled. Left/Right follow reading direction (in RTL, ArrowLeft moves forward);
 * Up/Down are always previous/next. Movement wraps around, as the ARIA radio group pattern does.
 */
export function nextRovingIndex(
  current: number,
  key: string,
  count: number,
  dir: ReadingDirection,
): number | null {
  if (count <= 0) return null;
  const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  const from = Math.min(Math.max(current, 0), count - 1);

  switch (key) {
    case forward:
    case "ArrowDown":
      return (from + 1) % count;
    case backward:
    case "ArrowUp":
      return (from - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
