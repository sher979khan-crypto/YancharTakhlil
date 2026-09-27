import * as z from "zod";

import { CHART_RANGES, ChartRangeSchema, type ChartRange } from "@/lib/domain/market";

/**
 * Bad request input. Its message is written here, never copied from the input, so it is safe to
 * return to the client as is.
 */
export class ApiInputError extends Error {
  override readonly name = "ApiInputError";
}

export const CoinIdParamSchema = z.string().regex(/^[a-z0-9-]{1,100}$/);

// Canonical integers only, so "030", "30.0", " 30" and "3e1" are rejected rather than coerced.
const RangeParamSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,2}$/)
  .transform(Number)
  .pipe(ChartRangeSchema);

/** Lowercase ids only; anything else is a 400, not a 404, so bad links surface as bugs. */
export function parseCoinId(raw: string): string {
  const result = CoinIdParamSchema.safeParse(raw);
  if (!result.success) {
    throw new ApiInputError("id must be 1-100 lowercase letters, digits or hyphens");
  }
  return result.data;
}

/** The required `range` query parameter. */
export function parseChartRange(searchParams: URLSearchParams): ChartRange {
  const result = RangeParamSchema.safeParse(searchParams.get("range"));
  if (!result.success) {
    throw new ApiInputError(`range is required and must be one of ${CHART_RANGES.join(", ")}`);
  }
  return result.data;
}
