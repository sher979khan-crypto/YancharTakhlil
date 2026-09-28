import { describe, expect, it } from "vitest";

import {
  decideChain,
  median,
  percentile,
  renderReport,
  summarizeModel,
  type EvalLocale,
  type EvalOutcome,
  type EvalRecord,
  type ModelStats,
} from "./eval-analyst-stats";

function record(
  model: string,
  locale: EvalLocale,
  outcome: EvalOutcome,
  latencyMs: number,
): EvalRecord {
  return {
    model,
    coin: "bitcoin",
    locale,
    outcome,
    latencyMs,
    promptTokens: 1500,
    completionTokens: 300,
    answeredBy: outcome === "rate_limited" ? null : model,
    errorCode: outcome === "rate_limited" ? "RATE_LIMITED" : null,
    answer:
      outcome === "ok"
        ? {
            signal: "HOLD",
            confidence: "medium",
            summary: "Mixed | signals",
            reasons: [{ metric: "indicators.rsi14", stance: "neutral", text: "RSI is 55." }],
            risks: ["Volatility is high."],
            invalidation: { metric: "indicators.low30d", text: "A close below the low." },
            stanceAgrees: true,
          }
        : null,
    rejectedContent: outcome === "language" ? "The price is rising." : null,
  };
}

describe("median and percentile", () => {
  it("returns null for no values", () => {
    expect(median([])).toBeNull();
    expect(percentile([], 90)).toBeNull();
  });

  it("takes the middle value, or the mean of the two middle ones", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("uses the nearest rank for p90", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(percentile([5, 1, 3], 90)).toBe(5);
    expect(percentile([7], 90)).toBe(7);
  });
});

describe("summarizeModel", () => {
  const records = [
    record("a", "en", "ok", 4000),
    record("a", "ar", "language", 6000),
    record("a", "uz", "ok", 8000),
    record("a", "en", "rate_limited", 300),
    record("a", "ar", "timeout", 15000),
    record("a", "uz", "schema", 5000),
    record("b", "en", "ok", 1000),
  ];

  it("computes rates over every attempt of that model", () => {
    const stats = summarizeModel("a", records);
    expect(stats.attempts).toBe(6);
    expect(stats.valid).toBe(2);
    expect(stats.validRate).toBeCloseTo(2 / 6);
    expect(stats.rateLimitedRate).toBeCloseTo(1 / 6);
    expect(stats.timeoutRate).toBeCloseTo(1 / 6);
    expect(stats.outcomes).toEqual({ ok: 2, language: 1, rate_limited: 1, timeout: 1, schema: 1 });
  });

  it("measures latency over answered calls only (no 429s or timeouts)", () => {
    const stats = summarizeModel("a", records);
    // 4000, 5000, 6000, 8000
    expect(stats.medianLatencyMs).toBe(5500);
    expect(stats.p90LatencyMs).toBe(8000);
  });

  it("counts the language pass rate only where the language check ran", () => {
    const { perLocale } = summarizeModel("a", records);
    expect(perLocale.en).toEqual({ attempts: 2, valid: 1, languageChecked: 1, languagePassed: 1 });
    expect(perLocale.ar).toEqual({ attempts: 2, valid: 0, languageChecked: 1, languagePassed: 0 });
    // A schema failure never reached the language check.
    expect(perLocale.uz).toEqual({ attempts: 2, valid: 1, languageChecked: 1, languagePassed: 1 });
  });

  it("has no latency for a model that never answered", () => {
    const stats = summarizeModel("c", [record("c", "en", "rate_limited", 200)]);
    expect(stats.medianLatencyMs).toBeNull();
    expect(stats.p90LatencyMs).toBeNull();
    expect(stats.validRate).toBe(0);
  });
});

function stats(
  model: string,
  validRate: number,
  medianLatencyMs: number | null,
  p90LatencyMs: number | null,
  validPerLocale: [number, number, number] = [1, 1, 1],
): ModelStats {
  const [en, ar, uz] = validPerLocale;
  const locale = (valid: number) => ({
    attempts: 2,
    valid,
    languageChecked: valid,
    languagePassed: valid,
  });
  return {
    model,
    attempts: 6,
    valid: en + ar + uz,
    validRate,
    rateLimitedRate: 0,
    timeoutRate: 0,
    outcomes: {},
    medianLatencyMs,
    p90LatencyMs,
    perLocale: { en: locale(en), ar: locale(ar), uz: locale(uz) },
  };
}

describe("decideChain", () => {
  it("orders qualified models by valid rate, then median latency, and keeps 3", () => {
    const decision = decideChain([
      stats("slow", 0.83, 9000, 11000),
      stats("fast", 0.83, 5000, 7000),
      stats("best", 1, 8000, 9000),
      stats("fourth", 0.5, 3000, 4000),
    ]);
    expect(decision.chain).toEqual(["best", "fast", "slow"]);
    expect(decision.qualified).toEqual(["best", "fast", "slow", "fourth"]);
    expect(decision.unreliable).toBe(false);
    // Worst p90 in the chain is 11 s: 11 + 2 = 13 s.
    expect(decision.perModelTimeoutMs).toBe(13_000);
  });

  it("drops models under 50% valid or without a valid answer in some locale", () => {
    const decision = decideChain([
      stats("low", 0.33, 4000, 5000),
      stats("no-arabic", 0.67, 4000, 5000, [2, 0, 2]),
      stats("good", 0.5, 6000, 7000),
      stats("also-good", 0.67, 7000, 8000),
    ]);
    expect(decision.qualified).toEqual(["also-good", "good"]);
    expect(decision.chain).toEqual(["also-good", "good"]);
  });

  it("keeps the timeout between 12 s and 15 s", () => {
    expect(decideChain([stats("a", 1, 2000, 3000), stats("b", 1, 2000, 4000)])).toMatchObject({
      perModelTimeoutMs: 12_000,
    });
    expect(decideChain([stats("a", 1, 9000, 14500), stats("b", 1, 2000, 4000)])).toMatchObject({
      perModelTimeoutMs: 15_000,
    });
  });

  it("flags fewer than 2 qualified models and falls back to the best with any valid answer", () => {
    const decision = decideChain([
      stats("none", 0, null, null, [0, 0, 0]),
      stats("some", 0.33, 5000, 6000, [1, 1, 0]),
      stats("only", 0.67, 7000, 9000),
    ]);
    expect(decision.unreliable).toBe(true);
    expect(decision.qualified).toEqual(["only"]);
    expect(decision.chain).toEqual(["only", "some"]);
    expect(decision.perModelTimeoutMs).toBe(12_000);
  });
});

describe("renderReport", () => {
  it("includes the summary, every call, the valid answers' text and rejected raw answers", () => {
    const records = [record("a", "en", "ok", 4000), record("a", "ar", "language", 6000)];
    const modelStats = [summarizeModel("a", records)];
    const report = renderReport(
      {
        date: "2026-09-28",
        coins: ["bitcoin"],
        totalCalls: 2,
        callBudget: 30,
        perCallTimeoutMs: 15_000,
        stoppedEarly: null,
      },
      records,
      modelStats,
      decideChain(modelStats),
    );
    expect(report).toContain("OpenRouter calls: 2 of 30");
    expect(report).toContain("| a | 2 | 50% | 0% | 0% | 5.0 s | 6.0 s | 1/1 | 0/1 | – | 1/0/0 |");
    // A pipe in model text must not break the table or list.
    expect(report).toContain("Summary: Mixed \\| signals");
    expect(report).toContain("`indicators.rsi14` (neutral): RSI is 55.");
    expect(report).toContain("The price is rising.");
    expect(report).toContain("**Fewer than 2 models qualified");
  });
});
