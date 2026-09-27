import { describe, expect, it } from "vitest";

import { VALID_EN_ANSWER } from "./__fixtures__/analyst-fixtures";
import { LEVEL_KEYS, METRIC_KEYS } from "./metrics";
import {
  analystResponseFormat,
  AnalystOutputSchema,
  buildAnalystJsonSchema,
  REASON_TEXT_MAX,
  SENTENCE_MAX,
  SUMMARY_MAX,
} from "./output-schema";

const valid = VALID_EN_ANSWER;
const reason = valid.reasons[0] ?? { metric: "indicators.rsi14", stance: "neutral", text: "x" };

describe("AnalystOutputSchema", () => {
  it("accepts a valid answer and drops unknown keys", () => {
    expect(AnalystOutputSchema.parse({ ...valid, extra: "ignored" })).toEqual(valid);
  });

  it.each([
    ["a lowercase signal", { signal: "buy" }],
    ["a percentage confidence", { confidence: "80%" }],
    ["an unknown stance", { reasons: [{ ...reason, stance: "positive" }, reason] }],
    ["one reason", { reasons: [reason] }],
    ["five reasons", { reasons: [reason, reason, reason, reason, reason] }],
    ["no risks", { risks: [] }],
    ["four risks", { risks: ["a", "b", "c", "d"] }],
    ["an unknown metric", { reasons: [{ ...reason, metric: "price.usd" }, reason] }],
    ["a metric as a level", { invalidation: { metric: "indicators.rsi14", text: "x" } }],
    ["a long summary", { summary: "x".repeat(SUMMARY_MAX + 1) }],
    ["a long reason", { reasons: [{ ...reason, text: "x".repeat(REASON_TEXT_MAX + 1) }, reason] }],
    ["a long risk", { risks: ["x".repeat(SENTENCE_MAX + 1)] }],
    ["an empty summary", { summary: "   " }],
    ["a missing invalidation", { invalidation: undefined }],
  ])("rejects %s", (_label, patch) => {
    expect(AnalystOutputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("buildAnalystJsonSchema", () => {
  const schema = buildAnalystJsonSchema();

  it("describes the same shape, strict-mode ready", () => {
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["signal", "confidence", "summary", "reasons", "risks", "invalidation"],
      properties: {
        signal: { type: "string", enum: ["BUY", "HOLD", "SELL"] },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        summary: { type: "string", minLength: 1, maxLength: SUMMARY_MAX },
        reasons: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["metric", "stance", "text"],
            properties: {
              metric: { enum: [...METRIC_KEYS] },
              stance: { enum: ["bullish", "bearish", "neutral"] },
              text: { maxLength: REASON_TEXT_MAX },
            },
          },
        },
        risks: { type: "array", minItems: 1, maxItems: 3, items: { maxLength: SENTENCE_MAX } },
        invalidation: {
          type: "object",
          additionalProperties: false,
          required: ["metric", "text"],
          properties: { metric: { enum: [...LEVEL_KEYS] }, text: { maxLength: SENTENCE_MAX } },
        },
      },
    });
  });
});

describe("analystResponseFormat", () => {
  it("maps each json mode to OpenRouter's response_format", () => {
    expect(analystResponseFormat("schema")).toEqual({
      type: "json_schema",
      json_schema: { name: "analyst_output", strict: true, schema: buildAnalystJsonSchema() },
    });
    expect(analystResponseFormat("object")).toEqual({ type: "json_object" });
    expect(analystResponseFormat("none")).toBeUndefined();
  });
});
