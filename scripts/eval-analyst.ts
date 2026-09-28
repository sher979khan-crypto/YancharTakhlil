/**
 * Manual evaluation of free OpenRouter models for the AI Analyst (Step 14). Run only with
 * `EVAL_CONFIRM=1 pnpm eval:analyst`; never in CI. It spends real free-tier quota.
 *
 * One attempt per (model x coin x locale) through the app's own code path (openrouter-client ->
 * parse-json -> AnalystOutputSchema -> language -> numbers -> invalidation side, via checkAnswer),
 * without the fallback chain, cache, guards or cooldown. It runs as a Vitest file (see
 * scripts/eval-analyst.config.ts) because that already resolves "@/" and server-only for Node;
 * no extra TS runner is needed.
 *
 * Output (outside the repo): EVAL_OUT_DIR (default: <os tmp>/yanchar-takhlil-eval) gets
 * analyst-eval-<timestamp>.md and .json. Keys are read from .env.local and never printed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { test } from "vitest";

import { aiConfig, type AiModelConfig } from "@/config/ai";
import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import { loadAnalysisInput } from "@/lib/ai/analyst/load-analysis-input";
import {
  buildUserMessage,
  checkAnswer,
  outcomeForError,
  type AttemptContext,
} from "@/lib/ai/agents/analyst/analyze-coin";
import { buildDisplay } from "@/lib/ai/agents/analyst/display";
import { availableLevels, availableMetrics } from "@/lib/ai/agents/analyst/metrics";
import { analystResponseFormat } from "@/lib/ai/agents/analyst/output-schema";
import { buildSystemPrompt } from "@/lib/ai/agents/analyst/system-prompt";
import { signalAgreesWithReasons } from "@/lib/ai/agents/analyst/verify";
import { isAiError } from "@/lib/ai/core/errors";
import { createChatCompletion } from "@/lib/ai/core/openrouter-client";
import { getServerEnv } from "@/lib/env/server-env";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

import {
  decideChain,
  EVAL_LOCALES,
  renderReport,
  renderSummaryTable,
  summarizeModel,
  type EvalOutcome,
  type EvalRecord,
} from "./eval-analyst-stats";

/** Hard cap for the whole run, 429s and timeouts included (free tier: 50/day per account). */
const CALL_BUDGET = 30;
/** Free models allow 20 requests/min; one call per 3.5 s stays under it. */
const MIN_GAP_MS = 3_500;
/** The Step 14 timeout cap: a slower answer could not be used by the chain anyway. */
const PER_CALL_TIMEOUT_MS = 15_000;
const MID_CAP_RANKS = { min: 40, max: 60 } as const;
const REJECTED_CONTENT_MAX = 1_500;

function outputDir(): string {
  const dir = resolve(process.env.EVAL_OUT_DIR ?? join(tmpdir(), "yanchar-takhlil-eval"));
  if (!relative(process.cwd(), dir).startsWith("..")) {
    throw new Error("EVAL_OUT_DIR must be outside the repository (eval output is not committed).");
  }
  return dir;
}

/** The first coin ranked 40-60 whose input has no null values (so every metric is allowed). */
async function pickMidCap(): Promise<AnalysisInput> {
  const { data: coins } = await getMarketDataProvider().getTopCoins();
  const candidates = coins.filter(
    (coin) => coin.rank >= MID_CAP_RANKS.min && coin.rank <= MID_CAP_RANKS.max,
  );
  for (const coin of candidates) {
    const { data } = await loadAnalysisInput(coin.id);
    if (data.dataQuality.missing.length === 0) return data;
    console.info(`[eval] skipping ${coin.id}: missing ${data.dataQuality.missing.join(", ")}`);
  }
  throw new Error("No coin ranked 40-60 has complete analysis input.");
}

function contextFor(input: AnalysisInput, locale: (typeof EVAL_LOCALES)[number]): AttemptContext {
  return {
    input,
    display: buildDisplay(input, locale),
    allowedMetrics: new Set(availableMetrics(input)),
    allowedLevels: new Set(availableLevels(input)),
    locale,
  };
}

test("evaluate the analyst's free models", async () => {
  process.loadEnvFile(".env.local");
  const env = getServerEnv();
  const apiKey = env.OPENROUTER_API_KEY_ANALYST;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY_ANALYST is not set in .env.local.");
  const outDir = outputDir();

  const bitcoin = await loadAnalysisInput("bitcoin");
  if (bitcoin.source !== "coingecko") {
    throw new Error("The evaluation needs live CoinGecko data (set COINGECKO_API_KEY).");
  }
  const midCap = await pickMidCap();
  const inputs = [bitcoin.data, midCap];
  console.info(`[eval] coins: ${inputs.map((input) => input.coin.id).join(", ")}`);

  const models: readonly AiModelConfig[] = aiConfig.analystEvalCandidates;
  const records: EvalRecord[] = [];
  let calls = 0;
  let stoppedEarly: string | null = null;

  // Interleaved: every model answers one (coin, locale) before any model gets the next one, so
  // a burst of provider trouble spreads over all models instead of sinking one.
  run: for (const input of inputs) {
    for (const locale of EVAL_LOCALES) {
      const context = contextFor(input, locale);
      const messages = [
        { role: "system" as const, content: buildSystemPrompt(locale) },
        { role: "user" as const, content: buildUserMessage(context) },
      ];
      for (const model of models) {
        if (calls >= CALL_BUDGET) {
          stoppedEarly = `call budget of ${CALL_BUDGET} reached`;
          break run;
        }
        if (calls > 0) await sleep(MIN_GAP_MS);
        calls += 1;

        const base = { model: model.id, coin: input.coin.id, locale };
        const started = performance.now();
        let record: EvalRecord;
        try {
          const completion = await createChatCompletion({
            apiKey,
            model: model.id,
            messages,
            temperature: aiConfig.analyst.temperature,
            maxTokens: aiConfig.analyst.maxTokens,
            responseFormat: analystResponseFormat(model.jsonMode),
            disableReasoning: aiConfig.analyst.disableReasoning,
            timeoutMs: PER_CALL_TIMEOUT_MS,
          });
          const checked = checkAnswer(completion.content, context);
          const outcome: EvalOutcome = checked.ok ? "ok" : (checked.outcome as EvalOutcome);
          record = {
            ...base,
            outcome,
            latencyMs: completion.latencyMs,
            promptTokens: completion.usage.promptTokens,
            completionTokens: completion.usage.completionTokens,
            answeredBy: completion.model,
            errorCode: null,
            answer: checked.ok
              ? { ...checked.output, stanceAgrees: signalAgreesWithReasons(checked.output) }
              : null,
            rejectedContent: checked.ok ? null : completion.content.slice(0, REJECTED_CONTENT_MAX),
          };
        } catch (error) {
          if (!isAiError(error)) throw error;
          record = {
            ...base,
            outcome: outcomeForError(error) as EvalOutcome,
            latencyMs: Math.round(performance.now() - started),
            promptTokens: null,
            completionTokens: null,
            answeredBy: null,
            errorCode: error.code,
            answer: null,
            rejectedContent: null,
          };
          if (error.code === "AUTH" || error.code === "PAYMENT_REQUIRED") {
            records.push(record);
            stoppedEarly = `account-wide refusal (${error.code})`;
            break run;
          }
        }
        records.push(record);
        console.info(
          `[eval] ${calls}/${CALL_BUDGET} ${record.model} ${record.coin} ${record.locale} ${record.outcome} ${record.latencyMs}ms`,
        );
      }
    }
  }

  const stats = models.map((model) => summarizeModel(model.id, records));
  const decision = decideChain(stats);
  const date = new Date().toISOString();
  const meta = {
    date: date.slice(0, 10),
    coins: inputs.map((input) => input.coin.id),
    totalCalls: calls,
    callBudget: CALL_BUDGET,
    perCallTimeoutMs: PER_CALL_TIMEOUT_MS,
    stoppedEarly,
  };

  mkdirSync(outDir, { recursive: true });
  const stamp = date.replace(/[:.]/g, "-");
  const reportPath = join(outDir, `analyst-eval-${stamp}.md`);
  const jsonPath = join(outDir, `analyst-eval-${stamp}.json`);
  writeFileSync(reportPath, renderReport(meta, records, stats, decision));
  writeFileSync(jsonPath, `${JSON.stringify({ meta, stats, decision, records }, null, 2)}\n`);

  console.info(`\n${renderSummaryTable(stats)}\n`);
  console.info(`[eval] calls: ${calls}/${CALL_BUDGET}${stoppedEarly ? ` (${stoppedEarly})` : ""}`);
  console.info(`[eval] chain: ${decision.chain.join(" -> ") || "none"}`);
  console.info(`[eval] perModelTimeoutMs: ${decision.perModelTimeoutMs}`);
  if (decision.unreliable) console.info("[eval] fewer than 2 models qualified");
  console.info(`[eval] report: ${reportPath}`);
  console.info(`[eval] json:   ${jsonPath}`);
});
