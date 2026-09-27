import { describe, expect, it, vi } from "vitest";

import type { AiModelConfig } from "@/config/ai";
import { loadAnalysisInput } from "@/lib/ai/analyst/load-analysis-input";
import { createTtlCache } from "@/lib/ai/core/cache";
import { AiBusyError } from "@/lib/ai/core/errors";
import { createAiGuards, type GuardLimits } from "@/lib/ai/core/guards";
import { AnalysisResultSchema } from "@/lib/api/contract";
import { MarketDataError } from "@/lib/domain/errors";
import { createFixtureMarketDataProvider } from "@/lib/providers/fixture/fixture-market-data-provider";
import type { MarketDataProvider } from "@/lib/providers/market-data-provider";

import {
  completionBody,
  TEST_NOW,
  VALID_EN_ANSWER,
  VALID_UZ_ANSWER,
} from "./__fixtures__/analyst-fixtures";
import { createAnalyst, type AnalystDeps } from "./analyze-coin";
import { buildAnalystJsonSchema, type AnalystOutput } from "./output-schema";

const API_KEY = "sk-or-analyst-test-key";
const IP = "203.0.113.9";
const MODELS: AiModelConfig[] = [
  { id: "m/one:free", jsonMode: "schema" },
  { id: "m/two:free", jsonMode: "object" },
  { id: "m/three:free", jsonMode: "none" },
];
const LIMITS: GuardLimits = { perIpPerMinute: 3, perIpPerDay: 20, globalPerDay: 45 };

type Reply = { status?: number; content?: string; body?: unknown; delayMs?: number };

const json = (output: unknown) => JSON.stringify(output);

function setup({
  replies = [],
  apiKey = API_KEY,
  limits = LIMITS,
  provider = createFixtureMarketDataProvider(),
}: {
  replies?: Reply[];
  apiKey?: string;
  limits?: GuardLimits;
  provider?: MarketDataProvider;
} = {}) {
  let time = 0;
  const clock = () => time;
  const queue = [...replies];
  const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
    const reply = queue.shift();
    if (!reply) throw new Error("unexpected fetch");
    time += reply.delayMs ?? 1000;
    if (reply.status && reply.status !== 200) {
      return new Response(JSON.stringify({ error: { code: reply.status } }), {
        status: reply.status,
      });
    }
    const model = (JSON.parse(String(init?.body)) as { model: string }).model;
    return Response.json(reply.body ?? completionBody(reply.content ?? "", model));
  });
  const lines: string[] = [];
  const loadInput = vi.fn<AnalystDeps["loadInput"]>((id, now) =>
    loadAnalysisInput(id, { provider, now }),
  );
  const analyze = createAnalyst({
    loadInput,
    getApiKey: () => apiKey || undefined,
    models: MODELS,
    cache: createTtlCache({ ttlMs: 900_000 }),
    guards: createAiGuards({ ...limits, now: () => TEST_NOW.getTime() }),
    fetchImpl,
    clock,
    siteUrl: () => "https://example.com",
    log: (line) => lines.push(line),
  });
  const run = (id = "bitcoin", locale: "en" | "ar" | "uz" = "en", ip = IP) =>
    analyze(id, locale, { ip, now: () => TEST_NOW });
  return { run, fetchImpl, lines, loadInput, advance: (ms: number) => (time += ms) };
}

function requestBody(fetchImpl: ReturnType<typeof setup>["fetchImpl"], call = 0) {
  return JSON.parse(String(fetchImpl.mock.calls[call]?.[1]?.body)) as {
    model: string;
    messages: { role: string; content: string }[];
    response_format?: unknown;
  };
}

describe("analyzeCoin: AI answers", () => {
  it("returns a validated ai result with server-formatted values", async () => {
    const { run, fetchImpl, lines } = setup({ replies: [{ content: json(VALID_EN_ANSWER) }] });
    const result = await run();

    expect(AnalysisResultSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({
      kind: "ai",
      model: "m/one:free",
      promptVersion: "analyst-v2",
      signal: "BUY",
      confidence: "medium",
      summary: VALID_EN_ANSWER.summary,
      risks: VALID_EN_ANSWER.risks,
      generatedAt: TEST_NOW.toISOString(),
      data: { source: "fixture", stale: false },
    });
    expect(result.reasons[0]).toEqual({
      metric: "indicators.trend",
      stance: "bullish",
      text: VALID_EN_ANSWER.reasons[0]?.text,
      templateKey: null,
      value: "up",
    });
    expect(result.reasons[2]?.value).toBe("-2.35%");
    expect(result.invalidation).toEqual({
      metric: "indicators.sma50",
      text: VALID_EN_ANSWER.invalidation.text,
      templateKey: null,
      value: "$95,762.90",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(lines).toEqual(["[analyst] m/one:free ok 1000ms 1500/300"]);
  });

  it("sends the system prompt and one data-only user message", async () => {
    const { run, fetchImpl } = setup({ replies: [{ content: json(VALID_EN_ANSWER) }] });
    await run();
    const body = requestBody(fetchImpl);
    expect(body.model).toBe("m/one:free");
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "analyst_output", strict: true, schema: buildAnalystJsonSchema() },
    });
    const [system, user] = body.messages;
    expect(system?.role).toBe("system");
    expect(system?.content).toContain("Write all text in English.");
    expect(user?.role).toBe("user");
    const payload = JSON.parse(user?.content ?? "") as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual([
      "input",
      "display",
      "allowedMetrics",
      "allowedLevels",
      "language",
    ]);
    expect(payload).toMatchObject({
      input: { coin: { id: "bitcoin" } },
      display: { "price.usd": "$97,250.00" },
      language: "English",
    });
    expect(payload.allowedLevels).toContain("indicators.sma50");
  });

  it("accepts an Uzbek answer with uz-formatted numbers", async () => {
    const { run, fetchImpl } = setup({ replies: [{ content: json(VALID_UZ_ANSWER) }] });
    const result = await run("bitcoin", "uz");
    expect(result.kind).toBe("ai");
    expect(result.invalidation?.value).toBe("$95 762,90");
    expect(requestBody(fetchImpl).messages[0]?.content).toContain(
      "Write all text in Uzbek (Latin script).",
    );
  });

  it("parses an answer wrapped in a think block and a code fence", async () => {
    const content = "<think>hmm</think>\n```json\n" + json(VALID_EN_ANSWER) + "\n```";
    const { run } = setup({ replies: [{ content }] });
    expect((await run()).kind).toBe("ai");
  });

  it("logs a warning, but keeps the answer, when the signal goes against its reasons", async () => {
    const answer: AnalystOutput = {
      ...VALID_EN_ANSWER,
      reasons: VALID_EN_ANSWER.reasons.map((reason) => ({ ...reason, stance: "bearish" })),
    };
    const { run, lines } = setup({ replies: [{ content: json(answer) }] });
    expect((await run()).kind).toBe("ai");
    expect(lines).toContain(
      "[analyst] m/one:free warning: signal disagrees with the reasons' majority stance",
    );
  });
});

describe("analyzeCoin: validation chain", () => {
  const invalidNumbers: AnalystOutput = {
    ...VALID_EN_ANSWER,
    summary: "The price could reach $150,000.00 soon.",
  };
  const wrongSide: AnalystOutput = {
    ...VALID_EN_ANSWER,
    invalidation: { metric: "indicators.high30d", text: "A move above $101,807.00." },
  };

  it.each([
    ["invalid_json", "Sorry, I can't produce JSON."],
    ["schema", json({ ...VALID_EN_ANSWER, signal: "STRONG BUY" })],
    ["numbers", json(invalidNumbers)],
    ["invalidation", json(wrongSide)],
  ])("rejects an answer with outcome %s and tries the next model", async (outcome, content) => {
    const { run, fetchImpl, lines } = setup({
      replies: [{ content }, { content: json(VALID_EN_ANSWER) }],
    });
    const result = await run();
    expect(result).toMatchObject({ kind: "ai", model: "m/two:free" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchImpl, 1).response_format).toEqual({ type: "json_object" });
    expect(lines[0]).toBe(`[analyst] m/one:free ${outcome} 1000ms 1500/300`);
    expect(lines[1]).toBe("[analyst] m/two:free ok 1000ms 1500/300");
  });

  it("rejects a metric whose value is null for this coin", async () => {
    const provider = createFixtureMarketDataProvider();
    const shortHistory: MarketDataProvider = {
      ...provider,
      // 40 days: no sma50, so the model must not cite it.
      getDailyPrices: async (id) => {
        const result = await provider.getDailyPrices(id, 90);
        return { ...result, data: result.data.slice(-40) };
      },
    };
    const { run, lines } = setup({
      provider: shortHistory,
      replies: [{ content: json(VALID_EN_ANSWER) }, { status: 503 }, { status: 503 }],
    });
    const result = await run();
    expect(lines[0]).toBe("[analyst] m/one:free schema 1000ms 1500/300");
    expect(result.kind).toBe("basic");
  });

  it("the third model uses no response_format", async () => {
    const { run, fetchImpl } = setup({
      replies: [{ status: 503 }, { status: 503 }, { content: json(VALID_EN_ANSWER) }],
    });
    expect((await run()).model).toBe("m/three:free");
    expect(requestBody(fetchImpl, 2)).not.toHaveProperty("response_format");
  });
});

describe("analyzeCoin: model errors and budgets", () => {
  it("moves on after a rate limit or a timeout", async () => {
    const { run, lines } = setup({
      replies: [{ status: 429 }, { status: 408 }, { content: json(VALID_EN_ANSWER) }],
    });
    expect((await run()).model).toBe("m/three:free");
    expect(lines.slice(0, 2)).toEqual([
      "[analyst] m/one:free rate_limited 1000ms -/- (RATE_LIMITED)",
      "[analyst] m/two:free timeout 1000ms -/- (TIMEOUT)",
    ]);
  });

  it("falls back to a basic analysis when every model fails", async () => {
    const { run, fetchImpl, lines } = setup({
      replies: [{ status: 500 }, { content: "no json" }, { content: json({}) }],
    });
    const result = await run();
    expect(AnalysisResultSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({
      kind: "basic",
      model: null,
      promptVersion: "basic-v1",
      confidence: "low",
      summary: null,
      risks: [],
    });
    for (const reason of result.reasons) {
      expect(reason.text).toBeNull();
      expect(reason.templateKey).not.toBeNull();
      expect(reason.value.length).toBeGreaterThan(0);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(lines.at(-1)).toBe("[analyst] no model answer passed; serving a basic analysis");
  });

  it("stops the chain on an auth or credit refusal (account-wide)", async () => {
    for (const status of [401, 402]) {
      const { run, fetchImpl } = setup({ replies: [{ status }] });
      expect((await run()).kind).toBe("basic");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("serves basic without any call when the key is missing", async () => {
    const { run, fetchImpl, lines } = setup({ apiKey: "" });
    const result = await run();
    expect(result.kind).toBe("basic");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lines).toEqual([
      "[analyst] OPENROUTER_API_KEY_ANALYST is not set; serving basic analyses",
    ]);
  });

  it("stops starting models once the 25 s budget is nearly spent", async () => {
    const { run, fetchImpl, lines } = setup({
      replies: [
        { content: "x", delayMs: 12_000 },
        { content: "x", delayMs: 11_000 },
      ],
    });
    expect((await run()).kind).toBe("basic");
    // 23 s spent: less than minAttemptMs (3 s) left, so model three is skipped.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(lines).toContain("[analyst] time budget spent; skipping m/three:free");
  });

  it("gives the last model only the time left in the budget", async () => {
    const { run, fetchImpl } = setup({
      replies: [
        { content: "x", delayMs: 12_000 },
        { content: "x", delayMs: 5_000 },
        { content: json(VALID_EN_ANSWER) },
      ],
    });
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await run();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(timeout.mock.calls.map(([ms]) => ms)).toEqual([12_000, 12_000, 8_000]);
    timeout.mockRestore();
  });

  it("serves basic when the global daily LLM budget is spent", async () => {
    const { run, fetchImpl, lines } = setup({
      limits: { ...LIMITS, globalPerDay: 1 },
      replies: [{ content: "x" }],
    });
    expect((await run()).kind).toBe("basic");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(lines).toContain("[analyst] daily LLM call budget reached");
  });

  it("never logs the key, the prompt, the answer or the IP", async () => {
    const { run, lines } = setup({
      replies: [{ status: 429 }, { content: "Here: 42" }, { content: json(VALID_EN_ANSWER) }],
    });
    await run();
    const logged = lines.join("\n");
    for (const secret of [API_KEY, IP, "AI Analyst", "Here: 42", VALID_EN_ANSWER.summary]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe("analyzeCoin: cache and guards", () => {
  it("serves a cached result per coin + locale without calls or guard use", async () => {
    const { run, fetchImpl, loadInput } = setup({
      limits: { ...LIMITS, perIpPerMinute: 1 },
      replies: [{ content: json(VALID_EN_ANSWER) }, { content: json(VALID_UZ_ANSWER) }],
    });
    const first = await run();
    expect(await run()).toBe(first);
    expect(await run("bitcoin", "en", "198.51.100.2")).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(loadInput).toHaveBeenCalledTimes(1);
    // A different locale is a different entry, and this IP's minute slot is used up.
    await expect(run("bitcoin", "uz")).rejects.toBeInstanceOf(AiBusyError);
    expect((await run("bitcoin", "uz", "198.51.100.2")).kind).toBe("ai");
  });

  it("shares one analysis between concurrent requests", async () => {
    const { run, fetchImpl } = setup({ replies: [{ content: json(VALID_EN_ANSWER) }] });
    const [a, b] = await Promise.all([run(), run("bitcoin", "en", "198.51.100.2")]);
    expect(a).toBe(b);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses an uncached request over the per-IP limit with a Retry-After", async () => {
    const { run } = setup({ apiKey: "" });
    await run("bitcoin");
    await run("ethereum");
    await run("solana");
    const error = await run("pepe").catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(AiBusyError);
    expect((error as AiBusyError).retryAfterSeconds).toBe(60);
  });

  it("propagates NOT_FOUND and does not cache it", async () => {
    const provider: MarketDataProvider = {
      ...createFixtureMarketDataProvider(),
      getCoinDetail: () => Promise.reject(new MarketDataError("NOT_FOUND", "Coin not found")),
    };
    const { run, loadInput } = setup({ provider, apiKey: "" });
    await expect(run("tether")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(run("tether")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(loadInput).toHaveBeenCalledTimes(2);
  });
});
