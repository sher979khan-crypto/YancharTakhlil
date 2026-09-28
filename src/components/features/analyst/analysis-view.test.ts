import { describe, expect, it } from "vitest";

import { AI_RESULT, BASIC_RESULT } from "@/lib/api/__fixtures__/analysis-results";

import { disclaimerKind, invalidationSide, toAnalysisView } from "./analysis-view";

describe("toAnalysisView", () => {
  it("maps an ai result: tone, segments, free text, headline and the ai disclaimer", () => {
    const view = toAnalysisView(AI_RESULT);
    expect(view).toMatchObject({
      kind: "ai",
      signal: "BUY",
      signalTone: "up",
      confidence: "medium",
      confidenceSegments: 2,
      summary: AI_RESULT.summary,
      risks: AI_RESULT.risks,
      suggestion: "BUY",
      disclaimer: "ai",
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

  it("maps a basic result: templates, no summary or risks, the basic disclaimer, demo data flagged", () => {
    const view = toAnalysisView(BASIC_RESULT);
    expect(view).toMatchObject({
      kind: "basic",
      signalTone: "brand",
      confidenceSegments: 1,
      summary: null,
      risks: [],
      suggestion: "HOLD",
      disclaimer: "basic",
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

  it.each([
    ["ai", "BUY"],
    ["ai", "HOLD"],
    ["ai", "SELL"],
    ["basic", "BUY"],
    ["basic", "HOLD"],
    ["basic", "SELL"],
  ] as const)("a %s %s result gets that headline and disclaimer", (kind, signal) => {
    const base = kind === "ai" ? AI_RESULT : BASIC_RESULT;
    const view = toAnalysisView({ ...base, signal });
    expect(view.suggestion).toBe(signal);
    expect(view.signalTone).toBe({ BUY: "up", HOLD: "brand", SELL: "down" }[signal]);
    expect(view.disclaimer).toBe(kind);
  });

  it("never exposes the model id to the UI", () => {
    expect(toAnalysisView(AI_RESULT)).not.toHaveProperty("model");
  });
});

describe("invalidationSide", () => {
  it("is below for BUY, above for SELL and past for HOLD", () => {
    expect(invalidationSide("BUY")).toBe("below");
    expect(invalidationSide("SELL")).toBe("above");
    expect(invalidationSide("HOLD")).toBe("past");
  });
});

describe("disclaimerKind", () => {
  it("speaks for the AI before any result, then for the kind that answered", () => {
    expect(disclaimerKind(null)).toBe("ai");
    expect(disclaimerKind(AI_RESULT)).toBe("ai");
    expect(disclaimerKind(BASIC_RESULT)).toBe("basic");
  });
});
