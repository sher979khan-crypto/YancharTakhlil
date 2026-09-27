// Test-only data for the Analyst tests: the fixture provider's bitcoin input and model answers.
import type { AnalysisInput } from "@/lib/ai/analyst/analysis-input";
import { loadAnalysisInput } from "@/lib/ai/analyst/load-analysis-input";
import { createFixtureMarketDataProvider } from "@/lib/providers/fixture/fixture-market-data-provider";

import type { AnalystOutput } from "../output-schema";

export const TEST_NOW = new Date("2026-09-27T12:00:00.000Z");

/**
 * Bitcoin from the fixture snapshot: price $97,250.00, trend up, RSI 51.68, 7d -2.35%, sma50
 * $95,762.90, high30d $101,807.00, fromAth -22.87%, volume trend +8.26%, market cap $1.94T.
 */
export async function bitcoinInput(): Promise<AnalysisInput> {
  const { data } = await loadAnalysisInput("bitcoin", {
    provider: createFixtureMarketDataProvider(),
    now: () => TEST_NOW,
  });
  return data;
}

/** A BUY answer that passes every check against bitcoinInput() in English. */
export const VALID_EN_ANSWER: AnalystOutput = {
  signal: "BUY",
  confidence: "medium",
  summary:
    "Based on the data, the analysis recommends buying. The trend is up and the price is +1.55% above the 50-day average.",
  reasons: [
    {
      metric: "indicators.trend",
      stance: "bullish",
      text: "The 20-day average at $96,279.80 is above the 50-day average at $95,762.90.",
    },
    {
      metric: "indicators.volumeTrend7dPct",
      stance: "bullish",
      text: "Volume over the last 7 days is +8.26% versus the prior period.",
    },
    {
      metric: "price.change7dPct",
      stance: "bearish",
      text: "The price moved -2.35% over 7 days, so short-term momentum is soft.",
    },
  ],
  risks: ["The price is still -22.87% from its all-time high of $126,080.00."],
  invalidation: {
    metric: "indicators.sma50",
    text: "A move below $95,762.90 would weaken this view.",
  },
};

/** The same view in Uzbek, citing display values in the uz notation. */
export const VALID_UZ_ANSWER: AnalystOutput = {
  ...VALID_EN_ANSWER,
  summary:
    "Maʼlumotlarga koʻra, tahlil sotib olishni tavsiya qiladi. Trend yuqoriga va narx 50 kunlik oʻrtachadan +1,55% yuqori.",
  reasons: [
    {
      metric: "indicators.rsi14",
      stance: "neutral",
      text: "RSI 14 koʻrsatkichi 51,68 da, momentum muvozanatda.",
    },
    {
      metric: "indicators.trend",
      stance: "bullish",
      text: "20 kunlik oʻrtacha $96 279,80, 50 kunlik oʻrtacha $95 762,90 dan yuqori.",
    },
  ],
  risks: ["Bozor kapitallashuvi $1,94 trln, narx eng yuqori darajadan -22,87% pastda."],
  invalidation: {
    metric: "indicators.sma50",
    text: "Narx $95 762,90 dan pastga tushsa, bu fikr zaiflashadi.",
  },
};

/** The same view in Arabic. */
export const VALID_AR_ANSWER: AnalystOutput = {
  ...VALID_EN_ANSWER,
  summary:
    "بناءً على البيانات، يوصي التحليل بالشراء. الاتجاه صاعد والسعر أعلى من متوسط 50 يومًا بنسبة +1.55%.",
  reasons: [
    {
      metric: "indicators.rsi14",
      stance: "neutral",
      text: "مؤشر القوة النسبية عند 51.68 يدل على زخم متوازن.",
    },
    {
      metric: "indicators.trend",
      stance: "bullish",
      text: "متوسط 20 يومًا عند $96,279.80 أعلى من متوسط 50 يومًا.",
    },
  ],
  risks: ["القيمة السوقية $1.94 تريليون والسعر أدنى من القمة التاريخية بنسبة -22.87%."],
  invalidation: { metric: "indicators.sma50", text: "هبوط السعر دون $95,762.90 يضعف هذا الرأي." },
};

/** An OpenRouter chat completion body carrying `content`. */
export function completionBody(content: string, model = "qwen/qwen3.8-27b:free") {
  return {
    id: "gen-test",
    model,
    choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1500, completion_tokens: 300, total_tokens: 1800 },
  };
}
