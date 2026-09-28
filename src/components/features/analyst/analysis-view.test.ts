import { describe, expect, it } from "vitest";

import { AI_RESULT, BASIC_RESULT } from "@/lib/api/__fixtures__/analysis-results";

import { invalidationSide, toAnalysisView } from "./analysis-view";

describe("toAnalysisView", () => {
  it("maps an ai result: tone, segments, free text and the model", () => {
    const view = toAnalysisView(AI_RESULT);
    expect(view).toMatchObject({
      kind: "ai",
      signal: "BUY",
      signalTone: "up",
      confidence: "medium",
      confidenceSegments: 2,
      summary: AI_RESULT.summary,
      risks: AI_RESULT.risks,
      model: "qwen/qwen3.8-27b:free",
      isDemo: false,
    });
    expect(view.reasons[0]).toEqual({
      metric: "indicators.trend",
      stance: "bullish",
      stanceTone: "up",
      value: { kind: "trend", trend: "up" },
      text: { kind: "text", text: "The 20-day average is above the 50-day average." },
    });
    expect(view.reasons[2]).toMatchObject({
      stanceTone: "down",
      value: { kind: "formatted", value: "-2.35%" },
    });
    expect(view.invalidation).toEqual({
      side: "below",
      metric: "indicators.sma50",
      value: "$95,762.90",
      text: { kind: "text", text: "A move below $95,762.90 would weaken this view." },
    });
  });

  it("maps a basic result: templates, no summary, risks or model, demo data flagged", () => {
    const view = toAnalysisView(BASIC_RESULT);
    expect(view).toMatchObject({
      kind: "basic",
      signalTone: "brand",
      confidenceSegments: 1,
      summary: null,
      risks: [],
      model: null,
      isDemo: true,
    });
    expect(view.reasons.map((reason) => reason.text)).toEqual([
      { kind: "template", key: "trendUp" },
      { kind: "template", key: "rsiStrong" },
      { kind: "template", key: "change7dDown" },
    ]);
    expect(view.invalidation).toMatchObject({
      side: "past",
      text: { kind: "template", key: "invalidationBelow" },
    });
  });

  it("gives SELL the down tone, high confidence three segments and a null invalidation", () => {
    const view = toAnalysisView({
      ...AI_RESULT,
      signal: "SELL",
      confidence: "high",
      invalidation: null,
    });
    expect(view.signalTone).toBe("down");
    expect(view.confidenceSegments).toBe(3);
    expect(view.invalidation).toBeNull();
  });

  it("shows a neutral reason in the muted tone", () => {
    const view = toAnalysisView({
      ...AI_RESULT,
      reasons: [
        {
          metric: "price.change24hPct",
          stance: "neutral",
          text: "The price barely moved today.",
          templateKey: null,
          value: "+0.12%",
        },
      ],
    });
    expect(view.reasons[0]?.stanceTone).toBe("muted");
  });
});

describe("invalidationSide", () => {
  it("is below for BUY, above for SELL and past for HOLD", () => {
    expect(invalidationSide("BUY")).toBe("below");
    expect(invalidationSide("SELL")).toBe("above");
    expect(invalidationSide("HOLD")).toBe("past");
  });
});
