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
 * Free models (":free", checked in OpenRouter's /api/v1/models on 2026-09-28): 20 requests/min and
 * 50/day on accounts with less than $10 of credits purchased.
 */
export const aiConfig = {
  openRouter: {
    chatCompletionsUrl: "https://openrouter.ai/api/v1/chat/completions",
  },
  analyst: {
    /**
     * Set from the Step 14.1 re-evaluation (2026-09-28, `pnpm eval:analyst`: 12 calls, bitcoin +
     * sky, en/ar/uz, one attempt each, with the Step 14.1 validation rules). Rule (Step 14): >= 50%
     * valid overall and >= 1 valid per locale, ordered by valid rate then median latency, at most 3.
     * Both qualified:
     * - dots-3-note-preview: 6/6 valid (2/2/2), median 13.4 s, p90 14.6 s, no 429s.
     * - nemotron-3-super: 5/6 valid (1/2/2; 1 UPSTREAM error), median 10.3 s, p90 13.0 s.
     * Step 14.2 (owner, after the Mentor's quality review of those answers): nemotron goes first.
     * Its answers were more balanced (dots-3 said HOLD every time), its Arabic cleaner (dots-3
     * mixed English words in) and it was faster; the valid-rate order alone put dots-3 first.
     * Step 14 (old rules) had dots-3 6/6 and nemotron 2/6: its 4 rejections were RSI thresholds
     * such as "40-70", now neutral numbers. Dropped in Step 14: qwen3.8-27b (5x 429, 1 timeout),
     * gemma-4-31b-it and gemma-4-26b-a4b-it (6/6 429).
     */
    models: [
      // supported_parameters: response_format and structured_outputs
      { id: "nvidia/nemotron-3-super-120b-a12b:free", jsonMode: "schema" },
      // supported_parameters: response_format and structured_outputs
      { id: "dots-studio/dots-3-note-preview:free", jsonMode: "schema" },
    ] satisfies readonly AiModelConfig[],
    temperature: 0.3,
    maxTokens: 900,
    /**
     * Reasoning tokens count against max_tokens (OpenRouter reasoning-tokens guide), so a thinking
     * model could spend all 900 on hidden reasoning and return empty content. The prompt asks for
     * no hidden reasoning anyway.
     */
    disableReasoning: true,
    /**
     * Step 14.1 (owner): the 15 s cap of the Step 14 rule, max(12 s, the chain's worst p90 + 2 s).
     * With the 25 s budget the second model still gets about 10 s.
     */
    perModelTimeoutMs: 15_000,
    /** Netlify functions have a hard time limit; stay well under it. */
    totalBudgetMs: 25_000,
    /** A model is not started with less time than this left in the budget. */
    minAttemptMs: 3_000,
    /**
     * Circuit breaker (lib/ai/core/cooldown.ts, per instance): a model that just returned 429 or
     * timed out is skipped for a while instead of spending the request's budget on it again.
     */
    cooldown: { rateLimitedMs: 60_000, timeoutMs: 30_000 },
    promptVersion: "analyst-v3",
  },
  /**
   * Candidates for the manual evaluation (scripts/eval-analyst.ts, `pnpm eval:analyst`); never
   * used by the app. jsonMode "schema" where supported_parameters lists structured_outputs,
   * otherwise "object" (/api/v1/models, re-checked 2026-09-28). Step 14.1 re-evaluated only the
   * two models that answered in Step 14; qwen3.8-27b (schema), gemma-4-31b-it and
   * gemma-4-26b-a4b-it (object) were dropped after 17 of 18 calls returned 429.
   */
  analystEvalCandidates: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free", jsonMode: "schema" },
    { id: "dots-studio/dots-3-note-preview:free", jsonMode: "schema" },
  ] satisfies readonly AiModelConfig[],
  guards: {
    perIpPerMinute: 3,
    perIpPerDay: 20,
    /** LLM calls (each model attempt) per UTC day, under the 50/day free-tier limit. */
    globalPerDay: 45,
  },
} as const;
