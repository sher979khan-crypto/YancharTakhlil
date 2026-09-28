import "server-only";

import { aiConfig, type AiModelConfig } from "@/config/ai";
import { cacheTtl } from "@/config/cache";
import { getSiteUrl } from "@/config/site";
import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import { loadAnalysisInput } from "@/lib/ai/analyst/load-analysis-input";
import { createTtlCache, type TtlCache } from "@/lib/ai/core/cache";
import { createModelCooldown, type ModelCooldown } from "@/lib/ai/core/cooldown";
import { AiBusyError, isAiError, type AiError } from "@/lib/ai/core/errors";
import { createAiGuards, type AiGuards } from "@/lib/ai/core/guards";
import { resolveModelChain } from "@/lib/ai/core/models";
import {
  createChatCompletion,
  type ChatCompletionResult,
  type ChatMessage,
} from "@/lib/ai/core/openrouter-client";
import { parseModelJson } from "@/lib/ai/core/parse-json";
import { AnalysisResultSchema, type AnalysisResult } from "@/lib/api/contract";
import type { MarketResult } from "@/lib/domain/market";
import { getServerEnv } from "@/lib/env/server-env";
import type { Locale } from "@/lib/i18n/config";
import { NOT_A_NUMBER } from "@/lib/i18n/format";

import { BASIC_RULES_VERSION, buildBasicAnalysis } from "./basic-analysis";
import { buildDisplay, type AnalysisDisplay } from "./display";
import { availableLevels, availableMetrics, type DisplayKey } from "./metrics";
import { AnalystOutputSchema, analystResponseFormat, type AnalystOutput } from "./output-schema";
import { buildSystemPrompt, PROMPT_LANGUAGE } from "./system-prompt";
import {
  buildAllowedNumbers,
  isInvalidationOnCorrectSide,
  outputTexts,
  signalAgreesWithReasons,
  verifyOutputNumbers,
} from "./verify";
import { isWrittenIn } from "./verify-language";

export type AttemptOutcome =
  | "ok"
  | "invalid_json"
  | "schema"
  | "language"
  | "numbers"
  | "invalidation"
  | "rate_limited"
  | "timeout"
  | "error"
  /** Skipped without a call: the model is cooling down from a recent 429 or timeout. */
  | "cooldown";

type AnalystSettings = Pick<
  typeof aiConfig.analyst,
  | "temperature"
  | "maxTokens"
  | "disableReasoning"
  | "perModelTimeoutMs"
  | "totalBudgetMs"
  | "minAttemptMs"
  | "promptVersion"
>;

export type AnalystDeps = {
  loadInput: (id: string, now: () => Date) => Promise<MarketResult<AnalysisInput>>;
  /** Read per request so a missing key is reported, not cached into the module. */
  getApiKey: () => string | undefined;
  models: readonly AiModelConfig[];
  cache: TtlCache;
  guards: AiGuards;
  /** Defaults to a fresh one per analyst with aiConfig.analyst.cooldown and `clock`. */
  cooldown?: ModelCooldown;
  settings?: AnalystSettings;
  fetchImpl?: typeof fetch;
  /** Monotonic milliseconds for the time budget and latencies. */
  clock?: () => number;
  siteUrl?: () => string | undefined;
  log?: (line: string) => void;
};

export type AnalyzeOptions = {
  /** Client IP for the per-IP limits (clientIpFromHeaders). */
  ip: string;
  now?: () => Date;
};

export type AnalyzeCoin = (
  id: string,
  locale: Locale,
  options: AnalyzeOptions,
) => Promise<AnalysisResult>;

type Checked = { ok: true; output: AnalystOutput } | { ok: false; outcome: AttemptOutcome };

export type AttemptContext = {
  input: AnalysisInput;
  display: AnalysisDisplay;
  allowedMetrics: ReadonlySet<string>;
  allowedLevels: ReadonlySet<string>;
  locale: Locale;
};

/**
 * The one user message: the data as JSON, then one line that repeats the answer language. Free
 * models follow the last instruction they read more reliably than a line deep in the system
 * prompt, which stays verbatim (owner-approved).
 */
export function buildUserMessage(context: AttemptContext): string {
  const language = PROMPT_LANGUAGE[context.locale];
  const data = JSON.stringify({
    input: context.input,
    display: context.display,
    allowedMetrics: [...context.allowedMetrics],
    allowedLevels: [...context.allowedLevels],
    language,
  });
  return `${data}\n\nRespond ONLY in ${language}.`;
}

/**
 * Validation chain for one answer: JSON -> schema (+ allowed keys) -> language -> numbers ->
 * invalidation side.
 */
export function checkAnswer(content: string, context: AttemptContext): Checked {
  const json = parseModelJson(content);
  if (!json.ok) return { ok: false, outcome: "invalid_json" };

  const parsed = AnalystOutputSchema.safeParse(json.value);
  if (!parsed.success) return { ok: false, outcome: "schema" };
  const output = parsed.data;
  // The enums allow every key; this input may have nulls the model was told not to use.
  if (
    !output.reasons.every((reason) => context.allowedMetrics.has(reason.metric)) ||
    !context.allowedLevels.has(output.invalidation.metric)
  ) {
    return { ok: false, outcome: "schema" };
  }

  if (!isWrittenIn(outputTexts(output), context.locale)) return { ok: false, outcome: "language" };

  const allowed = buildAllowedNumbers(context.input, context.display, context.locale);
  if (verifyOutputNumbers(output, allowed).length > 0) return { ok: false, outcome: "numbers" };

  if (!isInvalidationOnCorrectSide(output.signal, context.input, output)) {
    return { ok: false, outcome: "invalidation" };
  }
  return { ok: true, output };
}

export function outcomeForError(error: AiError): AttemptOutcome {
  if (error.code === "RATE_LIMITED" || error.code === "PAYMENT_REQUIRED") return "rate_limited";
  if (error.code === "TIMEOUT") return "timeout";
  return "error";
}

/** Account-wide refusals: the next model would get the same answer. */
function stopsChain(error: AiError): boolean {
  return error.code === "AUTH" || error.code === "PAYMENT_REQUIRED";
}

function formatTokens(value: number | null): string {
  return value === null ? "-" : String(value);
}

function displayValue(display: AnalysisDisplay, key: DisplayKey): string {
  // Allowed keys always have a display value (both come from the non-null metrics).
  return display[key] ?? NOT_A_NUMBER;
}

export function createAnalyst({
  loadInput,
  getApiKey,
  models,
  cache,
  guards,
  settings = aiConfig.analyst,
  fetchImpl,
  clock = () => performance.now(),
  siteUrl = () => undefined,
  log = (line) => console.info(line),
  cooldown = createModelCooldown({ ...aiConfig.analyst.cooldown, now: clock }),
}: AnalystDeps): AnalyzeCoin {
  let warnedNoKey = false;

  /** Tries each model in order; the first answer that passes every check wins. */
  async function runModelChain(
    apiKey: string,
    context: AttemptContext,
    deadline: number,
  ): Promise<{ output: AnalystOutput; completion: ChatCompletionResult } | null> {
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(context.locale) },
      { role: "user", content: buildUserMessage(context) },
    ];

    for (const model of models) {
      const remaining = deadline - clock();
      if (remaining < settings.minAttemptMs) {
        log(`[analyst] time budget spent; skipping ${model.id}`);
        break;
      }
      if (cooldown.isCoolingDown(model.id)) {
        log(`[analyst] ${model.id} cooldown 0ms -/-`);
        continue;
      }
      if (!guards.tryAcquireLlmCall()) {
        log("[analyst] daily LLM call budget reached");
        break;
      }

      const started = clock();
      let completion: ChatCompletionResult;
      try {
        completion = await createChatCompletion(
          {
            apiKey,
            model: model.id,
            messages,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            responseFormat: analystResponseFormat(model.jsonMode),
            disableReasoning: settings.disableReasoning,
            timeoutMs: Math.min(settings.perModelTimeoutMs, remaining),
            siteUrl: siteUrl(),
          },
          { fetchImpl, clock },
        );
      } catch (error) {
        const latency = Math.round(clock() - started);
        if (!isAiError(error)) throw error;
        if (error.code === "RATE_LIMITED") cooldown.record(model.id, "rate_limited");
        if (error.code === "TIMEOUT") cooldown.record(model.id, "timeout");
        log(`[analyst] ${model.id} ${outcomeForError(error)} ${latency}ms -/- (${error.code})`);
        if (stopsChain(error)) break;
        continue;
      }

      const { promptTokens, completionTokens } = completion.usage;
      const tokens = `${formatTokens(promptTokens)}/${formatTokens(completionTokens)}`;
      const checked = checkAnswer(completion.content, context);
      if (!checked.ok) {
        log(`[analyst] ${model.id} ${checked.outcome} ${completion.latencyMs}ms ${tokens}`);
        continue;
      }
      log(`[analyst] ${model.id} ok ${completion.latencyMs}ms ${tokens}`);
      if (!signalAgreesWithReasons(checked.output)) {
        log(`[analyst] ${model.id} warning: signal disagrees with the reasons' majority stance`);
      }
      return { output: checked.output, completion };
    }
    return null;
  }

  async function analyze(
    id: string,
    locale: Locale,
    { ip, now = () => new Date() }: AnalyzeOptions,
  ): Promise<AnalysisResult> {
    const decision = guards.tryAcquireAnalysis(ip);
    if (!decision.ok) throw new AiBusyError(decision.retryAfterSeconds);

    const deadline = clock() + settings.totalBudgetMs;
    const { data: input, source, fetchedAt, stale } = await loadInput(id, now);
    const display = buildDisplay(input, locale);
    const context: AttemptContext = {
      input,
      display,
      allowedMetrics: new Set(availableMetrics(input)),
      allowedLevels: new Set(availableLevels(input)),
      locale,
    };
    const common = { generatedAt: now().toISOString(), data: { source, fetchedAt, stale } };

    const apiKey = getApiKey();
    if (!apiKey && !warnedNoKey) {
      warnedNoKey = true;
      log("[analyst] OPENROUTER_API_KEY_ANALYST is not set; serving basic analyses");
    }
    const answer = apiKey ? await runModelChain(apiKey, context, deadline) : null;

    if (answer) {
      const { output, completion } = answer;
      return AnalysisResultSchema.parse({
        kind: "ai",
        model: completion.model,
        promptVersion: settings.promptVersion,
        signal: output.signal,
        confidence: output.confidence,
        summary: output.summary,
        reasons: output.reasons.map((reason) => ({
          ...reason,
          templateKey: null,
          value: displayValue(display, reason.metric),
        })),
        risks: output.risks,
        invalidation: {
          ...output.invalidation,
          templateKey: null,
          value: displayValue(display, output.invalidation.metric),
        },
        ...common,
      } satisfies AnalysisResult);
    }

    if (apiKey) log("[analyst] no model answer passed; serving a basic analysis");
    const basic = buildBasicAnalysis(input);
    return AnalysisResultSchema.parse({
      kind: "basic",
      model: null,
      promptVersion: BASIC_RULES_VERSION,
      signal: basic.signal,
      confidence: basic.confidence,
      summary: null,
      reasons: basic.reasons.map((reason) => ({
        ...reason,
        text: null,
        value: displayValue(display, reason.metric),
      })),
      risks: [],
      invalidation: basic.invalidation && {
        ...basic.invalidation,
        text: null,
        value: displayValue(display, basic.invalidation.metric),
      },
      ...common,
    } satisfies AnalysisResult);
  }

  /**
   * Cached per coin + locale (hits skip the guards): an "ai" result for cacheTtl.aiAnalysis, a
   * "basic" one for cacheTtl.aiBasic, so a failing model chain is not retried on every request
   * but gets another chance soon. Concurrent requests for one key share a single analysis.
   * Errors (AI_BUSY, NOT_FOUND, upstream) are not cached.
   */
  return (id, locale, options) =>
    cache.load(`${id}:${locale}`, () => analyze(id, locale, options), analysisCacheTtlMs);
}

/** In-process lifetime of one result: long for an AI answer, short for the rule-based fallback. */
export function analysisCacheTtlMs(result: AnalysisResult): number {
  return (result.kind === "ai" ? cacheTtl.aiAnalysis : cacheTtl.aiBasic) * 1000;
}

let defaultAnalyst: AnalyzeCoin | undefined;

function getDefaultAnalyst(): AnalyzeCoin {
  if (!defaultAnalyst) {
    const env = getServerEnv();
    defaultAnalyst = createAnalyst({
      loadInput: (id, now) => loadAnalysisInput(id, { now }),
      getApiKey: () => getServerEnv().OPENROUTER_API_KEY_ANALYST,
      models: resolveModelChain(aiConfig.analyst.models, env.OPENROUTER_MODEL_ANALYST),
      cache: createTtlCache({ ttlMs: cacheTtl.aiAnalysis * 1000 }),
      guards: createAiGuards(aiConfig.guards),
      siteUrl: getSiteUrl,
    });
  }
  return defaultAnalyst;
}

/**
 * The AI Analyst for one coin: cache -> per-IP guards -> loadAnalysisInput -> model chain with
 * validation -> "ai" result, or the rule-based "basic" result when there is no key, no model
 * answer passes, or the time or daily call budget runs out. Throws AiBusyError when this client
 * hit its limit, and MarketDataError (e.g. NOT_FOUND) from loading the input.
 */
export function analyzeCoin(
  id: string,
  locale: Locale,
  options: AnalyzeOptions,
): Promise<AnalysisResult> {
  return getDefaultAnalyst()(id, locale, options);
}
