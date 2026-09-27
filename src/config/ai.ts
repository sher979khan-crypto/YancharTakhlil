/**
 * How a model is asked for JSON (OpenRouter response_format):
 * - "schema": { type: "json_schema", json_schema: { name, strict: true, schema } }
 * - "object": { type: "json_object" }
 * - "none":   no response_format; the prompt alone asks for JSON.
 * Every answer is parsed defensively and validated whatever the mode.
 */
export type AiJsonMode = "schema" | "object" | "none";

export type AiModelConfig = Readonly<{ id: string; jsonMode: AiJsonMode }>;

/**
 * The only place model ids appear (CLAUDE.md §7). OPENROUTER_MODEL_ANALYST may replace the chain
 * with a comma-separated list; a listed id keeps its jsonMode from here, an unknown one gets "none".
 * Free models (":free", checked in OpenRouter's /api/v1/models on 2026-09-27): 20 requests/min and
 * 50/day on accounts with less than $10 of credits purchased.
 */
export const aiConfig = {
  openRouter: {
    chatCompletionsUrl: "https://openrouter.ai/api/v1/chat/completions",
  },
  analyst: {
    models: [
      // supported_parameters: structured_outputs (no response_format listed)
      { id: "qwen/qwen3.8-27b:free", jsonMode: "schema" },
      // supported_parameters: response_format only
      { id: "google/gemma-4-31b-it:free", jsonMode: "object" },
      // supported_parameters: response_format and structured_outputs
      { id: "nvidia/nemotron-3-super-120b-a12b:free", jsonMode: "schema" },
    ] satisfies readonly AiModelConfig[],
    temperature: 0.3,
    maxTokens: 900,
    /**
     * Reasoning tokens count against max_tokens (OpenRouter reasoning-tokens guide), so a thinking
     * model could spend all 900 on hidden reasoning and return empty content. The prompt asks for
     * no hidden reasoning anyway.
     */
    disableReasoning: true,
    perModelTimeoutMs: 12_000,
    /** Netlify functions have a hard time limit; stay well under it. */
    totalBudgetMs: 25_000,
    /** A model is not started with less time than this left in the budget. */
    minAttemptMs: 3_000,
    promptVersion: "analyst-v2",
  },
  guards: {
    perIpPerMinute: 3,
    perIpPerDay: 20,
    /** LLM calls (each model attempt) per UTC day, under the 50/day free-tier limit. */
    globalPerDay: 45,
  },
} as const;
