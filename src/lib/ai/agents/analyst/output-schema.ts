import "server-only";

import * as z from "zod";

import {
  ConfidenceSchema,
  LevelKeySchema,
  MetricKeySchema,
  SignalSchema,
  StanceSchema,
} from "@/lib/api/contract";

import type { ResponseFormat } from "@/lib/ai/core/openrouter-client";

// Lengths from the system prompt v2 OUTPUT section.
export const SUMMARY_MAX = 280;
export const REASON_TEXT_MAX = 200;
export const SENTENCE_MAX = 160;
/**
 * Owner rule (Step 14.1): a reason text or a risk must say something; the Step 14 evaluation had
 * a reason that was only "Trend". The summary and the invalidation keep the minimum of 1.
 */
export const REASON_RISK_MIN = 20;

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);

/** What the model must return. Extra keys are dropped; the JSON Schema below forbids them. */
export const AnalystOutputSchema = z.object({
  signal: SignalSchema,
  confidence: ConfidenceSchema,
  summary: text(SUMMARY_MAX),
  reasons: z
    .array(
      z.object({
        metric: MetricKeySchema,
        stance: StanceSchema,
        text: text(REASON_TEXT_MAX, REASON_RISK_MIN),
      }),
    )
    .min(2)
    .max(4),
  risks: z.array(text(SENTENCE_MAX, REASON_RISK_MIN)).min(1).max(3),
  invalidation: z.object({
    metric: LevelKeySchema,
    text: text(SENTENCE_MAX),
  }),
});
export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;

/**
 * The same shape as JSON Schema for response_format json_schema (zod v4 z.toJSONSchema).
 * "output" io gives additionalProperties: false and every key required, which strict mode needs.
 * The $schema key is dropped: providers only want the schema body.
 */
export function buildAnalystJsonSchema(): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    ...z.toJSONSchema(AnalystOutputSchema, { io: "output" }),
  };
  delete schema.$schema;
  return schema;
}

export const ANALYST_SCHEMA_NAME = "analyst_output";

export function analystResponseFormat(
  jsonMode: "schema" | "object" | "none",
): ResponseFormat | undefined {
  if (jsonMode === "schema") {
    return {
      type: "json_schema",
      json_schema: { name: ANALYST_SCHEMA_NAME, strict: true, schema: buildAnalystJsonSchema() },
    };
  }
  if (jsonMode === "object") return { type: "json_object" };
  return undefined;
}
