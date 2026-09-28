/**
 * Pure aggregation for scripts/eval-analyst.ts: per-model rates and latencies, the Step 14 chain
 * decision rule, and the Markdown report. No I/O, so it is unit-tested with the app's tests.
 */

export const EVAL_LOCALES = ["en", "ar", "uz"] as const;
export type EvalLocale = (typeof EVAL_LOCALES)[number];

/** AttemptOutcome of analyze-coin.ts minus "cooldown" (the eval has no chain to skip in). */
export type EvalOutcome =
  | "ok"
  | "invalid_json"
  | "schema"
  | "language"
  | "numbers"
  | "invalidation"
  | "rate_limited"
  | "timeout"
  | "error";

export type EvalAnswer = {
  signal: string;
  confidence: string;
  summary: string;
  reasons: { metric: string; stance: string; text: string }[];
  risks: string[];
  invalidation: { metric: string; text: string };
  /** signalAgreesWithReasons: false is only a warning in the app. */
  stanceAgrees: boolean;
};

export type EvalRecord = {
  model: string;
  coin: string;
  locale: EvalLocale;
  outcome: EvalOutcome;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  /** The model OpenRouter reports as having answered (null without an answer). */
  answeredBy: string | null;
  /** AiError code for rate_limited / timeout / error. */
  errorCode: string | null;
  /** Only for ok answers. */
  answer: EvalAnswer | null;
  /** Raw text of an answer that failed validation (truncated), to see why. */
  rejectedContent: string | null;
};

/** Outcomes where the model produced an answer (latency is a real generation time). */
const ANSWERED: ReadonlySet<EvalOutcome> = new Set([
  "ok",
  "invalid_json",
  "schema",
  "language",
  "numbers",
  "invalidation",
]);

/** Outcomes that got past the schema, so the language check ran on them. */
const LANGUAGE_CHECKED: ReadonlySet<EvalOutcome> = new Set([
  "ok",
  "language",
  "numbers",
  "invalidation",
]);

export type LocaleStats = {
  attempts: number;
  valid: number;
  /** Answers the language check ran on, and how many passed it. */
  languageChecked: number;
  languagePassed: number;
};

export type ModelStats = {
  model: string;
  attempts: number;
  valid: number;
  validRate: number;
  rateLimitedRate: number;
  timeoutRate: number;
  outcomes: Partial<Record<EvalOutcome, number>>;
  /** Over answered calls only; null when there were none. */
  medianLatencyMs: number | null;
  p90LatencyMs: number | null;
  perLocale: Record<EvalLocale, LocaleStats>;
};

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 === 1 ? upper : ((sorted[middle - 1] ?? 0) + upper) / 2;
}

/** Nearest-rank percentile (the smallest value with at least p% of the values at or below it). */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1] ?? null;
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

export function summarizeModel(model: string, records: readonly EvalRecord[]): ModelStats {
  const own = records.filter((record) => record.model === model);
  const count = (outcome: EvalOutcome) => own.filter((record) => record.outcome === outcome).length;

  const outcomes: Partial<Record<EvalOutcome, number>> = {};
  for (const record of own) outcomes[record.outcome] = (outcomes[record.outcome] ?? 0) + 1;

  const latencies = own
    .filter((record) => ANSWERED.has(record.outcome))
    .map((record) => record.latencyMs);

  const perLocale = Object.fromEntries(
    EVAL_LOCALES.map((locale) => {
      const inLocale = own.filter((record) => record.locale === locale);
      const checked = inLocale.filter((record) => LANGUAGE_CHECKED.has(record.outcome));
      const stats: LocaleStats = {
        attempts: inLocale.length,
        valid: inLocale.filter((record) => record.outcome === "ok").length,
        languageChecked: checked.length,
        languagePassed: checked.filter((record) => record.outcome !== "language").length,
      };
      return [locale, stats];
    }),
  ) as Record<EvalLocale, LocaleStats>;

  return {
    model,
    attempts: own.length,
    valid: count("ok"),
    validRate: rate(count("ok"), own.length),
    rateLimitedRate: rate(count("rate_limited"), own.length),
    timeoutRate: rate(count("timeout"), own.length),
    outcomes,
    medianLatencyMs: median(latencies),
    p90LatencyMs: percentile(latencies, 90),
    perLocale,
  };
}

export type ChainRule = {
  minValidRate: number;
  maxModels: number;
  minTimeoutMs: number;
  maxTimeoutMs: number;
  /** Added to the chosen models' worst p90 latency. */
  timeoutMarginMs: number;
};

export const STEP_14_RULE: ChainRule = {
  minValidRate: 0.5,
  maxModels: 3,
  minTimeoutMs: 12_000,
  maxTimeoutMs: 15_000,
  timeoutMarginMs: 2_000,
};

export type ChainDecision = {
  /** Models that met the rule, best first (before the maxModels cut). */
  qualified: string[];
  chain: string[];
  perModelTimeoutMs: number;
  /** Fewer than 2 qualified: the chain is the best available, not a reliable one. */
  unreliable: boolean;
};

function qualifies(stats: ModelStats, rule: ChainRule): boolean {
  return (
    stats.validRate >= rule.minValidRate &&
    EVAL_LOCALES.every((locale) => stats.perLocale[locale].valid >= 1)
  );
}

/**
 * Step 14 decision rule: keep models with >= 50% valid answers overall and >= 1 valid answer in
 * each locale; order by valid rate (desc), then median latency (asc); keep at most 3. Timeout:
 * max(12 s, worst p90 of the chain + 2 s), capped at 15 s. With fewer than 2 qualified models the
 * best one(s) are still returned (by the same order among all models with any valid answer), and
 * the decision is flagged unreliable for the owner.
 */
export function decideChain(stats: readonly ModelStats[], rule = STEP_14_RULE): ChainDecision {
  const byRank = [...stats].sort(
    (a, b) =>
      b.validRate - a.validRate ||
      (a.medianLatencyMs ?? Number.POSITIVE_INFINITY) -
        (b.medianLatencyMs ?? Number.POSITIVE_INFINITY),
  );
  const qualified = byRank.filter((model) => qualifies(model, rule));
  const unreliable = qualified.length < 2;
  const pool = unreliable
    ? [...qualified, ...byRank.filter((model) => model.valid > 0 && !qualified.includes(model))]
    : qualified;
  const chosen = pool.slice(0, rule.maxModels);

  const worstP90 = Math.max(0, ...chosen.map((model) => model.p90LatencyMs ?? 0));
  const perModelTimeoutMs = Math.min(
    rule.maxTimeoutMs,
    Math.max(rule.minTimeoutMs, Math.ceil(worstP90 + rule.timeoutMarginMs)),
  );
  return {
    qualified: qualified.map((model) => model.model),
    chain: chosen.map((model) => model.model),
    perModelTimeoutMs,
    unreliable,
  };
}

const percent = (value: number) => `${Math.round(value * 100)}%`;
const seconds = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderSummaryTable(stats: readonly ModelStats[]): string {
  const header = [
    "| Model | Calls | Valid | 429 | Timeout | Median | p90 | Lang en | Lang ar | Lang uz | Valid en/ar/uz | Outcomes |",
    "| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |",
  ];
  const rows = stats.map((model) => {
    const lang = (locale: EvalLocale) => {
      const { languageChecked, languagePassed } = model.perLocale[locale];
      return languageChecked === 0 ? "–" : `${languagePassed}/${languageChecked}`;
    };
    const validPerLocale = EVAL_LOCALES.map((locale) => model.perLocale[locale].valid).join("/");
    const outcomes = Object.entries(model.outcomes)
      .map(([outcome, n]) => `${outcome} ${n}`)
      .join(", ");
    return `| ${model.model} | ${model.attempts} | ${percent(model.validRate)} | ${percent(model.rateLimitedRate)} | ${percent(model.timeoutRate)} | ${seconds(model.medianLatencyMs)} | ${seconds(model.p90LatencyMs)} | ${lang("en")} | ${lang("ar")} | ${lang("uz")} | ${validPerLocale} | ${outcomes} |`;
  });
  return [...header, ...rows].join("\n");
}

export type ReportMeta = {
  date: string;
  coins: string[];
  totalCalls: number;
  callBudget: number;
  perCallTimeoutMs: number;
  stoppedEarly: string | null;
};

export function renderReport(
  meta: ReportMeta,
  records: readonly EvalRecord[],
  stats: readonly ModelStats[],
  decision: ChainDecision,
): string {
  const lines = [
    `# AI Analyst model evaluation (${meta.date})`,
    "",
    `- Coins: ${meta.coins.join(", ")}; locales: ${EVAL_LOCALES.join(", ")}`,
    `- OpenRouter calls: ${meta.totalCalls} of ${meta.callBudget} allowed`,
    `- Per-call timeout: ${meta.perCallTimeoutMs} ms; latency stats over answered calls only`,
    ...(meta.stoppedEarly ? [`- Stopped early: ${meta.stoppedEarly}`] : []),
    "",
    "## Per model",
    "",
    renderSummaryTable(stats),
    "",
    "Lang = language check passed / answers that reached it. Valid = every check passed.",
    "",
    "## Decision rule result",
    "",
    `- Qualified (>= 50% valid, >= 1 valid per locale): ${decision.qualified.join(", ") || "none"}`,
    `- Chain: ${decision.chain.join(" -> ") || "none"}`,
    `- perModelTimeoutMs: ${decision.perModelTimeoutMs}`,
    ...(decision.unreliable
      ? ["- **Fewer than 2 models qualified: the free models are not reliable enough.**"]
      : []),
    "",
    "## Calls",
    "",
    "| # | Model | Coin | Locale | Outcome | Latency | Tokens in/out |",
    "| --: | --- | --- | --- | --- | --: | --: |",
    ...records.map(
      (record, index) =>
        `| ${index + 1} | ${record.model} | ${record.coin} | ${record.locale} | ${record.outcome}${record.errorCode ? ` (${record.errorCode})` : ""} | ${record.latencyMs} ms | ${record.promptTokens ?? "-"}/${record.completionTokens ?? "-"} |`,
    ),
    "",
    "## Valid answers",
  ];

  for (const record of records) {
    const { answer } = record;
    if (!answer) continue;
    lines.push(
      "",
      `### ${record.model} · ${record.coin} · ${record.locale}`,
      "",
      `- Signal: **${answer.signal}**, confidence ${answer.confidence}${answer.stanceAgrees ? "" : " (warning: signal disagrees with the reasons' majority stance)"}`,
      `- Answered by: ${record.answeredBy ?? "-"} in ${record.latencyMs} ms`,
      `- Summary: ${cell(answer.summary)}`,
      "- Reasons:",
      ...answer.reasons.map(
        (reason) => `  - \`${reason.metric}\` (${reason.stance}): ${cell(reason.text)}`,
      ),
      "- Risks:",
      ...answer.risks.map((risk) => `  - ${cell(risk)}`),
      `- Invalidation: \`${answer.invalidation.metric}\`: ${cell(answer.invalidation.text)}`,
    );
  }

  const rejected = records.filter((record) => record.rejectedContent !== null);
  if (rejected.length > 0) {
    lines.push("", "## Rejected answers (raw, truncated)");
    for (const record of rejected) {
      lines.push(
        "",
        `### ${record.model} · ${record.coin} · ${record.locale} · ${record.outcome}`,
        "",
        "```text",
        record.rejectedContent ?? "",
        "```",
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
