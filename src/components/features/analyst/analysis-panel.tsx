"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentType, type ReactNode, type Ref } from "react";

import { coinHref } from "@/components/features/markets/coin-cells";
import { UpdatedAgo } from "@/components/features/markets/updated-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/ui/demo-banner";
import { glassSurfaceClassName } from "@/components/ui/glass";
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronIcon,
  DashIcon,
  DotIcon,
  SparkleIcon,
  SpinnerIcon,
  type IconProps,
} from "@/components/ui/icons";
import type { Signal, Stance } from "@/lib/api/contract";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

import {
  CONFIDENCE_SEGMENT_COUNT,
  toAnalysisView,
  type AnalysisView,
  type ReasonView,
  type SignalTone,
  type StanceTone,
  type ViewText,
} from "./analysis-view";
import type { AnalysisState } from "./use-analyses";

type AnalysisPanelProps = {
  coin: { id: string; name: string };
  /** Undefined while idle (nothing asked yet): only the footer shows. */
  state: AnalysisState | undefined;
  onRetry: () => void;
  /**
   * "list": a glass surface of its own under a markets row, titled with the agent name, with a
   * link to the coin page. "card": inside the coin page's Analyst card, which has the title.
   */
  variant: "list" | "card";
  ref?: Ref<HTMLDivElement>;
  className?: string;
};

/**
 * The AI Analyst's answer for one coin: loading, result (ai or basic) or error. The footer with
 * the disclaimer is always rendered by the UI, never left to the model.
 */
export function AnalysisPanel({
  coin,
  state,
  onRetry,
  variant,
  ref,
  className,
}: AnalysisPanelProps) {
  const t = useTranslations("Analyst");
  const view = state?.status === "result" ? toAnalysisView(state.result) : null;

  const announcement =
    state?.status === "loading"
      ? t("loading.status", { coin: coin.name })
      : state?.status === "busy"
        ? t("busy", { n: String(state.retryAfterSeconds) })
        : state?.status === "unavailable"
          ? t("unavailable")
          : "";

  return (
    <div
      ref={ref}
      // Focus target after "Analyze" is pressed on the coin page (the button goes away).
      tabIndex={ref ? -1 : undefined}
      className={cn(
        "@container flex flex-col gap-4 focus:outline-none",
        variant === "list" &&
          cn(glassSurfaceClassName, "rounded-xl border-cosmos/30 p-4 shadow-glow-cosmos"),
        className,
      )}
    >
      {/* One live region that exists before anything changes, so every state is announced. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {variant === "list" ? (
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
          <SparkleIcon className="text-lg text-cosmos" />
          {t("title")}
          <span className="sr-only">
            {": "}
            <bdi>{coin.name}</bdi>
          </span>
        </h2>
      ) : null}

      {state?.status === "loading" ? <LoadingBlock startedAt={state.startedAt} /> : null}
      {view ? <ResultView view={view} /> : null}
      {state?.status === "busy" ? (
        <BusyNotice
          receivedAt={state.receivedAt}
          retryAfterSeconds={state.retryAfterSeconds}
          onRetry={onRetry}
        />
      ) : null}
      {state?.status === "unavailable" ? (
        <ErrorNotice message={t("unavailable")}>
          <Button variant="secondary" onClick={onRetry}>
            {t("retry")}
          </Button>
        </ErrorNotice>
      ) : null}

      <PanelFooter coinId={coin.id} model={view?.model ?? null} showCoinLink={variant === "list"} />
    </div>
  );
}

/** Whole seconds since `sinceMs`, updated every `tickMs`. Client-only: never rendered on the server. */
function useSecondsSince(sinceMs: number, tickMs = 500): number {
  const [now, setNow] = useState(sinceMs);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return Math.max(0, Math.floor((now - sinceMs) / 1000));
}

/** Decorative progress: each line appears once its second has come (the steps are not tracked). */
const LOADING_STEPS = [
  { key: "data", at: 0 },
  { key: "indicators", at: 1 },
  { key: "ai", at: 2 },
  { key: "verify", at: 8 },
] as const;

function LoadingBlock({ startedAt }: { startedAt: number }) {
  const t = useTranslations("Analyst.loading");
  const elapsed = useSecondsSince(startedAt);
  const visible = LOADING_STEPS.filter((step) => elapsed >= step.at);

  return (
    <div className="flex flex-col gap-2">
      {/* Terminal look from the dark block, ice text and prompt marks; words stay in font-sans
          (font-mono is for numbers only: JetBrains Mono has no U+02BB for Uzbek). */}
      <div
        aria-hidden
        className="flex flex-col gap-1.5 rounded-lg border border-ice/20 bg-bg p-3 text-sm text-ice shadow-glow-ice"
      >
        <ol className="flex flex-col gap-1.5">
          {visible.map((step, index) => {
            const current = index === visible.length - 1;
            return (
              <li
                key={step.key}
                className="flex items-center gap-2 transition-opacity duration-base ease-snap motion-reduce:transition-none starting:opacity-0"
              >
                {current ? (
                  <SpinnerIcon className="text-xs" />
                ) : (
                  <CheckIcon className="text-xs text-up" />
                )}
                <span className={cn(!current && "text-fg-muted")}>{t(`steps.${step.key}`)}</span>
              </li>
            );
          })}
        </ol>
        <p className="flex items-center gap-2 border-t border-ice/15 pt-1.5 text-xs">
          <ChevronIcon className="text-fg-muted" />
          <bdi dir="ltr" className="font-mono tabular-nums">
            {t("elapsed", { seconds: String(elapsed) })}
          </bdi>
        </p>
      </div>
      <p className="text-xs text-fg-muted">{t("hint")}</p>
    </div>
  );
}

const SIGNAL_ICON: Readonly<Record<Signal, ComponentType<IconProps>>> = {
  BUY: ArrowUpIcon,
  HOLD: DashIcon,
  SELL: ArrowDownIcon,
};

// Same 12% tints as the Badge tones, which design-tokens.test.ts checks for contrast.
const SIGNAL_CLASSES: Readonly<Record<SignalTone, string>> = {
  up: "border-up/30 bg-up/12 text-up shadow-glow-up",
  brand: "border-brand/30 bg-brand/12 text-brand shadow-glow-brand",
  down: "border-down/30 bg-down/12 text-down shadow-glow-down",
};

const STANCE_ICON: Readonly<Record<Stance, ComponentType<IconProps>>> = {
  bullish: ArrowUpIcon,
  bearish: ArrowDownIcon,
  neutral: DotIcon,
};

const STANCE_CLASSES: Readonly<Record<StanceTone, string>> = {
  up: "text-up",
  down: "text-down",
  muted: "text-fg-muted",
};

function ResultView({ view }: { view: AnalysisView }) {
  const t = useTranslations("Analyst");
  const SignalIcon = SIGNAL_ICON[view.signal];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={view.kind === "ai" ? "cosmos" : "neutral"}>
          {view.kind === "ai" ? <SparkleIcon /> : null}
          {t(`kind.${view.kind}`)}
        </Badge>
        <UpdatedAgo timestamp={view.generatedAt} />
      </div>
      {view.kind === "basic" ? <p className="text-sm text-fg-muted">{t("basicNote")}</p> : null}
      {view.isDemo ? <DemoBanner /> : null}

      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-display text-xl font-semibold",
                SIGNAL_CLASSES[view.signalTone],
              )}
            >
              <SignalIcon />
              {t(`signal.${view.signal}`)}
            </p>
            <ConfidenceMeter view={view} />
          </div>
          {view.summary ? <p className="text-pretty text-fg">{view.summary}</p> : null}
          {view.invalidation ? <InvalidationBox view={view} /> : null}
        </div>

        <div className="flex flex-col gap-4">
          <Section title={t("reasons")}>
            <ul className="flex flex-col gap-3">
              {view.reasons.map((reason) => (
                <ReasonItem key={reason.metric} reason={reason} />
              ))}
            </ul>
          </Section>
          {view.risks.length > 0 ? (
            <Section title={t("risks")}>
              <ul className="flex flex-col gap-2">
                {view.risks.map((risk) => (
                  <li key={risk} className="flex gap-2.5 text-sm text-pretty text-fg">
                    <AlertIcon className="mt-0.5 text-base text-brand" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-xs font-medium tracking-wide text-fg-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function ConfidenceMeter({ view }: { view: AnalysisView }) {
  const t = useTranslations("Analyst.confidence");
  const level = t(view.confidence);

  return (
    // role="img": the segments and the visible text are read as the one label.
    <div
      role="img"
      aria-label={`${t("label")}: ${level}`}
      className="flex items-center gap-2 text-sm"
    >
      <span className="flex gap-1">
        {Array.from({ length: CONFIDENCE_SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2 w-5 rounded-full",
              index < view.confidenceSegments ? "bg-cosmos" : "bg-fg-subtle/35",
            )}
          />
        ))}
      </span>
      <span className="text-fg-muted">
        {t("label")}: <span className="font-medium text-fg">{level}</span>
      </span>
    </div>
  );
}

function useViewText() {
  const t = useTranslations("Analyst.basic.templates");
  return (text: ViewText) => {
    if (text === null) return null;
    return text.kind === "text" ? text.text : t(text.key);
  };
}

function ReasonItem({ reason }: { reason: ReasonView }) {
  const t = useTranslations("Analyst");
  const viewText = useViewText();
  const StanceIcon = STANCE_ICON[reason.stance];
  const text = viewText(reason.text);

  return (
    <li className="flex gap-2.5">
      <StanceIcon className={cn("mt-1 text-base", STANCE_CLASSES[reason.stanceTone])} />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <span className="sr-only">{t(`stance.${reason.stance}`)}: </span>
        <span className="inline-flex flex-wrap items-center gap-x-1.5 rounded-sm border border-glass-border bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
          {t(`metrics.${reason.metric}`)}:
          {reason.value.kind === "trend" ? (
            <span className="font-medium text-fg">{t(`trend.${reason.value.trend}`)}</span>
          ) : (
            <bdi dir="ltr" className="font-mono font-medium text-fg tabular-nums">
              {reason.value.value}
            </bdi>
          )}
        </span>
        {text ? <p className="text-sm text-pretty text-fg">{text}</p> : null}
      </div>
    </li>
  );
}

function InvalidationBox({ view }: { view: AnalysisView }) {
  const t = useTranslations("Analyst");
  const viewText = useViewText();
  const invalidation = view.invalidation;
  if (!invalidation) return null;
  const text = viewText(invalidation.text);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-cosmos/40 p-3">
      <p className="text-sm font-medium text-pretty text-fg">
        {t.rich(`invalidation.${invalidation.side}`, {
          value: invalidation.value,
          level: t(`metrics.${invalidation.metric}`),
          v: (chunks) => (
            <bdi dir="ltr" className="font-mono tabular-nums">
              {chunks}
            </bdi>
          ),
        })}
      </p>
      {text ? <p className="text-sm text-pretty text-fg-muted">{text}</p> : null}
    </div>
  );
}

type BusyNoticeProps = { receivedAt: number; retryAfterSeconds: number; onRetry: () => void };

function BusyNotice({ receivedAt, retryAfterSeconds, onRetry }: BusyNoticeProps) {
  const t = useTranslations("Analyst");
  const left = Math.max(0, retryAfterSeconds - useSecondsSince(receivedAt, 1000));

  return (
    <ErrorNotice
      message={left > 0 ? t("busy", { n: String(left) }) : t("busyReady")}
      className="tabular-nums"
    >
      <Button variant="secondary" disabled={left > 0} onClick={onRetry}>
        {t("retry")}
      </Button>
    </ErrorNotice>
  );
}

type ErrorNoticeProps = { message: string; className?: string; children: ReactNode };

function ErrorNotice({ message, className, children }: ErrorNoticeProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3">
      <AlertIcon className="text-base text-brand" />
      <p className={cn("flex-1 text-sm text-fg", className)}>{message}</p>
      {children}
    </div>
  );
}

type PanelFooterProps = { coinId: string; model: string | null; showCoinLink: boolean };

const footerLink =
  "inline-flex min-h-10 items-center gap-1 rounded-sm font-medium text-ice underline-offset-4 hover:underline";

function PanelFooter({ coinId, model, showCoinLink }: PanelFooterProps) {
  const t = useTranslations("Analyst");

  return (
    <div className="flex flex-wrap items-center gap-x-4 border-t border-glass-border pt-1 text-xs text-fg-subtle">
      <p className="py-2">{t("disclaimer")}</p>
      <Link href="/disclaimer" className={footerLink}>
        {t("fullDisclaimer")}
      </Link>
      {showCoinLink ? (
        <Link href={coinHref(coinId)} prefetch={false} className={footerLink}>
          {t("openCoinPage")}
          <ChevronIcon />
        </Link>
      ) : null}
      {model ? (
        <p className="py-2 @lg:ms-auto">
          {t.rich("model", {
            model,
            m: (chunks) => (
              <bdi dir="ltr" className="font-mono">
                {chunks}
              </bdi>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}
