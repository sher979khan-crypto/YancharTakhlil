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
     * Set from the Step 14 evaluation (2026-09-28, `pnpm eval:analyst`: 30 calls, bitcoin + sky,
     * en/ar/uz, one attempt each). Rule: >= 50% valid overall and >= 1 valid per locale, ordered
     * by valid rate then median latency, at most 3. Only dots-3 qualified, so the chain is the best
     * available, not a reliable one (owner decides on a paid fallback):
     * - dots-3-note-preview: 6/6 valid, median 10.8 s, p90 12.8 s, no 429s.
     * - nemotron-3-super: 2/6 valid (0/2 uz), median 7.6 s, p90 10.4 s; the other 4 failed the
     *   number check (it cites thresholds such as "40-70" that are not in the input).
     * Dropped: qwen3.8-27b (5x 429, 1 timeout), gemma-4-31b-it and gemma-4-26b-a4b-it (6/6 429).
     */
    models: [
      // supported_parameters: response_format and structured_outputs
      { id: "dots-studio/dots-3-note-preview:free", jsonMode: "schema" },
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
    /**
     * Step 14 rule: max(12 s, the chain's worst p90 + 2 s), capped at 15 s. dots-3's p90 was
     * 12 828 ms. With the 25 s budget the second model still gets about 10 s (nemotron p90 10.4 s).
     */
    perModelTimeoutMs: 14_828,
    /** Netlify functions have a hard time limit; stay well under it. */
    totalBudgetMs: 25_000,
    /** A model is not started with less time than this left in the budget. */
    minAttemptMs: 3_000,
    /**
     * Circuit breaker (lib/ai/core/cooldown.ts, per instance): a model that just returned 429 or
     * timed out is skipped for a while instead of spending the request's budget on it again.
     */
    cooldown: { rateLimitedMs: 60_000, timeoutMs: 30_000 },
    promptVersion: "analyst-v2",
  },
  /**
   * Candidates for the manual evaluation (scripts/eval-analyst.ts, `pnpm eval:analyst`); never
   * used by the app. jsonMode "schema" where supported_parameters lists structured_outputs,
   * otherwise "object" (/api/v1/models, re-checked 2026-09-28).
   */
  analystEvalCandidates: [
    { id: "qwen/qwen3.8-27b:free", jsonMode: "schema" },
    { id: "google/gemma-4-31b-it:free", jsonMode: "object" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", jsonMode: "schema" },
    { id: "dots-studio/dots-3-note-preview:free", jsonMode: "schema" },
    { id: "google/gemma-4-26b-a4b-it:free", jsonMode: "object" },
  ] satisfies readonly AiModelConfig[],
  guards: {
    perIpPerMinute: 3,
    perIpPerDay: 20,
    /** LLM calls (each model attempt) per UTC day, under the 50/day free-tier limit. */
    globalPerDay: 45,
  },
} as const;
