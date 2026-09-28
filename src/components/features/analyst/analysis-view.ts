import type {
  AnalysisResult,
  BasicTemplateKey,
  Confidence,
  Signal,
  Stance,
} from "@/lib/api/contract";
import type { LevelKey, MetricKey } from "@/lib/ai/agents/analyst/metrics";

/** Signal colors: never alone, always with an icon and the localized label. */
export type SignalTone = "up" | "brand" | "down";
export const SIGNAL_TONE: Readonly<Record<Signal, SignalTone>> = {
  BUY: "up",
  HOLD: "brand",
  SELL: "down",
};

export const CONFIDENCE_SEGMENT_COUNT = 3;
export const CONFIDENCE_SEGMENTS: Readonly<Record<Confidence, 1 | 2 | 3>> = {
  low: 1,
  medium: 2,
  high: 3,
};

export type StanceTone = "up" | "down" | "muted";
export const STANCE_TONE: Readonly<Record<Stance, StanceTone>> = {
  bullish: "up",
  bearish: "down",
  neutral: "muted",
};

/** Which way the price has to move to prove the view wrong (BUY below, SELL above, HOLD past). */
export type InvalidationSide = "below" | "above" | "past";
export function invalidationSide(signal: Signal): InvalidationSide {
  if (signal === "BUY") return "below";
  if (signal === "SELL") return "above";
  return "past";
}

export const TREND_VALUES = ["up", "down", "flat"] as const;
export type TrendValue = (typeof TREND_VALUES)[number];

/** The words of a reason: the model's text (ai) or a message key (basic). */
export type ViewText =
  { kind: "text"; text: string } | { kind: "template"; key: BasicTemplateKey } | null;

export type MetricValueView =
  /** Server-formatted number, shown as is in an LTR isolate. */
  | { kind: "formatted"; value: string }
  /** The trend enum, shown as a localized word. */
  | { kind: "trend"; trend: TrendValue };

export type ReasonView = {
  metric: MetricKey;
  stance: Stance;
  stanceTone: StanceTone;
  value: MetricValueView;
  text: ViewText;
};

export type InvalidationView = {
  side: InvalidationSide;
  metric: LevelKey;
  value: string;
  text: ViewText;
};

export type AnalysisView = {
  kind: AnalysisResult["kind"];
  signal: Signal;
  signalTone: SignalTone;
  confidence: Confidence;
  confidenceSegments: 1 | 2 | 3;
  /** Null for basic: it has no free text. */
  summary: string | null;
  reasons: ReasonView[];
  risks: string[];
  invalidation: InvalidationView | null;
  /** Headline key (Analyst.suggestion.<signal>): "Consider buying", never a command. */
  suggestion: Signal;
  /** Footer disclaimer key (Analyst.disclaimer.<kind>). */
  disclaimer: DisclaimerKind;
  generatedAt: string;
  /** Fixture market data: the demo-data note is required. */
  isDemo: boolean;
};

function viewText(text: string | null, templateKey: BasicTemplateKey | null): ViewText {
  if (text !== null) return { kind: "text", text };
  if (templateKey !== null) return { kind: "template", key: templateKey };
  return null;
}

function isTrendValue(value: string): value is TrendValue {
  return (TREND_VALUES as readonly string[]).includes(value);
}

function metricValue(metric: MetricKey, value: string): MetricValueView {
  return metric === "indicators.trend" && isTrendValue(value)
    ? { kind: "trend", trend: value }
    : { kind: "formatted", value };
}

export type DisclaimerKind = AnalysisResult["kind"];

/**
 * The footer is rendered in every state: before a result (idle, loading, errors) it speaks for
 * the AI Analyst, afterwards for whichever kind answered.
 */
export function disclaimerKind(result: AnalysisResult | null): DisclaimerKind {
  return result?.kind ?? "ai";
}

/** Everything the panel shows, decided in one pure, tested place. */
export function toAnalysisView(result: AnalysisResult): AnalysisView {
  const ai = result.kind === "ai";
  return {
    kind: result.kind,
    signal: result.signal,
    signalTone: SIGNAL_TONE[result.signal],
    confidence: result.confidence,
    confidenceSegments: CONFIDENCE_SEGMENTS[result.confidence],
    summary: ai ? result.summary : null,
    reasons: result.reasons.map((reason) => ({
      metric: reason.metric,
      stance: reason.stance,
      stanceTone: STANCE_TONE[reason.stance],
      value: metricValue(reason.metric, reason.value),
      text: viewText(ai ? reason.text : null, reason.templateKey),
    })),
    risks: ai ? result.risks : [],
    invalidation: result.invalidation && {
      side: invalidationSide(result.signal),
      metric: result.invalidation.metric,
      value: result.invalidation.value,
      text: viewText(ai ? result.invalidation.text : null, result.invalidation.templateKey),
    },
    suggestion: result.signal,
    disclaimer: disclaimerKind(result),
    generatedAt: result.generatedAt,
    isDemo: result.data.source === "fixture",
  };
}
