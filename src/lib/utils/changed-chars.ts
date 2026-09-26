/**
 * Marks which characters of `next` differ from `previous`, comparing from the end so digits
 * stay aligned by place value (units under units) even when the length changes.
 */
export function changedChars(previous: string, next: string): boolean[] {
  const offset = previous.length - next.length;
  return Array.from(next, (char, i) => previous[i + offset] !== char);
}
