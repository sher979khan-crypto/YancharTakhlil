/**
 * One uppercase letter for a logo placeholder: the first letter or digit of the symbol, then of
 * the name, else "?". Code points, not UTF-16 units, so an astral character is never split, and
 * en-US casing so the result does not depend on the runtime's locale data.
 */
export function getMonogram(symbol: string, name = ""): string {
  for (const source of [symbol, name]) {
    const char = Array.from(source.trim()).find((c) => /[\p{L}\p{N}]/u.test(c));
    if (char) return char.toLocaleUpperCase("en-US");
  }
  return "?";
}
