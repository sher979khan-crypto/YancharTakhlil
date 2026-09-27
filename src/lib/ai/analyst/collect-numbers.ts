import type { AnalysisInput } from "./analysis-input";

function walk(value: unknown, into: Set<number>): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    into.add(value);
    // "down 3.2%" cites -3.2 without its sign.
    if (value < 0) into.add(-value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(item, into);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) walk(child, into);
  }
}

/**
 * Every finite number in an AnalysisInput, plus the absolute value of each negative one, unique
 * and ascending. Step 12 checks each number the LLM cites against this list, so a number that is
 * not here was invented.
 */
export function collectNumbers(input: AnalysisInput): number[] {
  const numbers = new Set<number>();
  walk(input, numbers);
  return [...numbers].sort((a, b) => a - b);
}
