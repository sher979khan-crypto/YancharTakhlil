"use client";

import type { IChartApi, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCoinChart } from "@/lib/api/fetch-coins";
import { summarizeSeries } from "@/lib/domain/coin-stats";
import type { ChartRange, DailyPrice, MarketResult } from "@/lib/domain/market";
import type { PriceDirection } from "@/lib/domain/price-direction";
import { formatPercent, formatPrice, formatShortDate } from "@/lib/i18n/format";
import { getDir, type Locale } from "@/lib/i18n/config";
import {
  chartTimeToIsoDate,
  isolateForCanvas,
  priceMinMove,
  withAlpha,
} from "@/lib/utils/chart-helpers";
import { cn } from "@/lib/utils/cn";

const TITLE_ID = "price-chart-title";
const DEFAULT_RANGE: ChartRange = 30;

// SegmentedControl works with string values.
const RANGE_OPTIONS = [
  { value: "7", range: 7, label: "d7" },
  { value: "30", range: 30, label: "d30" },
  { value: "90", range: 90, label: "d90" },
] as const satisfies readonly { value: string; range: ChartRange; label: string }[];
type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

type SeriesByRange = Partial<Record<ChartRange, DailyPrice[]>>;
type ChartHandle = { chart: IChartApi; series: ISeriesApi<"Area"> };
type Tooltip = { x: number; width: number; date: string; price: number };

/** The token behind each direction: the line and fill follow the range's move. */
const directionToken: Record<PriceDirection, string> = {
  up: "up",
  down: "down",
  neutral: "ice",
};

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

type PriceChartProps = {
  coinId: string;
  /** The 30-day series rendered by the server; null when it failed to load. */
  initial: MarketResult<DailyPrice[]> | null;
  className?: string;
};

/**
 * Interactive 7/30/90-day area chart. lightweight-charts is loaded with a dynamic import, so only
 * this page downloads it. The 30-day series comes from the server; other ranges are fetched once
 * from /api/v1/coins/{id}/chart and kept per range. The chart is always LTR and aria-hidden; a
 * visually hidden summary carries its content.
 */
export function PriceChart({ coinId, initial, className }: PriceChartProps) {
  const t = useTranslations("CoinPage.chart");
  const locale = useLocale();

  const [range, setRange] = useState<ChartRange>(DEFAULT_RANGE);
  const [seriesByRange, setSeriesByRange] = useState<SeriesByRange>(() =>
    initial ? { [DEFAULT_RANGE]: initial.data } : {},
  );
  const [failedRanges, setFailedRanges] = useState<ReadonlySet<ChartRange>>(() =>
    initial ? new Set() : new Set([DEFAULT_RANGE]),
  );
  const [loadingRange, setLoadingRange] = useState<ChartRange | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [libraryFailed, setLibraryFailed] = useState(false);
  // Bumped by Retry after the chart library failed to load, to run the import again.
  const [libraryAttempt, setLibraryAttempt] = useState(0);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ChartHandle | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const points = seriesByRange[range];
  const summary = useMemo(() => (points ? summarizeSeries(points) : null), [points]);

  function load(target: ChartRange) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingRange(target);
    setFailedRanges((previous) => withoutRange(previous, target));
    fetchCoinChart(coinId, target, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setSeriesByRange((previous) => ({ ...previous, [target]: result.data }));
        setLoadingRange(null);
      },
      () => {
        if (controller.signal.aborted) return;
        setFailedRanges((previous) => new Set(previous).add(target));
        setLoadingRange(null);
      },
    );
  }

  function handleRangeChange(value: RangeValue) {
    const next = RANGE_OPTIONS.find((option) => option.value === value)?.range ?? DEFAULT_RANGE;
    setRange(next);
    setTooltip(null);
    // Each range is fetched once; a failed one waits for Retry.
    if (!seriesByRange[next] && !failedRanges.has(next)) load(next);
  }

  // Create the chart once per locale (formatters are locale-bound) and dispose it on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let created: ChartHandle | null = null;

    import("lightweight-charts").then(
      ({
        createChart,
        AreaSeries,
        ColorType,
        CrosshairMode,
        LastPriceAnimationMode,
        TickMarkType,
      }) => {
        if (disposed) return;
        const line = readToken("line");
        const subtle = readToken("fg-subtle");

        const chart = createChart(container, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: subtle,
            fontFamily: getComputedStyle(container).fontFamily,
            fontSize: 11,
            // The TradingView link the library's license asks for (see the Disclaimer notices).
            attributionLogo: true,
          },
          grid: {
            vertLines: { color: withAlpha(line, 0.5) },
            horzLines: { color: withAlpha(line, 0.5) },
          },
          rightPriceScale: { borderColor: line },
          timeScale: {
            borderColor: line,
            fixLeftEdge: true,
            fixRightEdge: true,
            tickMarkFormatter: (time: Time, type: number) => {
              const iso = chartTimeToIsoDate(time);
              return type === TickMarkType.Year
                ? iso.slice(0, 4)
                : isolateForCanvas(formatShortDate(iso, locale), getDir(locale));
            },
          },
          crosshair: {
            mode: CrosshairMode.Magnet,
            vertLine: { color: subtle, labelBackgroundColor: readToken("surface-3") },
            horzLine: { color: subtle, labelBackgroundColor: readToken("surface-3") },
          },
          // Never Intl with ar/uz: our own formatters for every label.
          localization: {
            locale: "en-US",
            priceFormatter: (price: number) => formatPrice(price, locale),
            timeFormatter: (time: Time) =>
              isolateForCanvas(
                formatShortDate(chartTimeToIsoDate(time), locale, { withYear: true }),
                getDir(locale),
              ),
          },
          // A static chart: the page keeps its wheel and touch scrolling. With no scrolling and
          // the last-price animation off, the chart never animates (reduced motion included).
          handleScroll: false,
          handleScale: false,
          kineticScroll: { touch: false, mouse: false },
        });
        const series = chart.addSeries(AreaSeries, {
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          lastPriceAnimation: LastPriceAnimationMode.Disabled,
          crosshairMarkerRadius: 4,
        });
        chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
          const value = param.seriesData.get(series);
          if (!param.time || !param.point || !value || !("value" in value)) {
            setTooltip(null);
            return;
          }
          setTooltip({
            x: param.point.x,
            width: container.clientWidth,
            date: chartTimeToIsoDate(param.time),
            price: value.value,
          });
        });
        created = { chart, series };
        handleRef.current = created;
        setChartReady(true);
      },
      () => {
        if (!disposed) setLibraryFailed(true);
      },
    );

    return () => {
      disposed = true;
      created?.chart.remove();
      handleRef.current = null;
      setChartReady(false);
    };
  }, [locale, libraryAttempt]);

  // Push the current range into the chart; colors follow its direction.
  useEffect(() => {
    const handle = handleRef.current;
    if (!chartReady || !handle || !points) return;
    const color = readToken(directionToken[summary?.direction ?? "neutral"]);
    const lowest = summary?.low ?? points[0]?.closeUsd ?? 0;
    handle.series.applyOptions({
      lineColor: color,
      topColor: withAlpha(color, 0.28),
      bottomColor: withAlpha(color, 0),
      crosshairMarkerBackgroundColor: color,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatPrice(price, locale),
        minMove: priceMinMove(lowest),
      },
    });
    handle.series.setData(points.map((point) => ({ time: point.date, value: point.closeUsd })));
    handle.chart.timeScale().fitContent();
  }, [chartReady, points, summary, locale]);

  // Abort a pending range request on unmount.
  useEffect(() => () => requestRef.current?.abort(), []);

  const loading = loadingRange === range || (!chartReady && !libraryFailed && !!points);
  const failed = libraryFailed || (failedRanges.has(range) && loadingRange !== range);

  return (
    <Card
      role="region"
      aria-labelledby={TITLE_ID}
      aria-busy={loading || undefined}
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={TITLE_ID} className="font-medium text-fg">
          {t("title")}
        </h2>
        <SegmentedControl
          aria-label={t("range")}
          options={RANGE_OPTIONS.map((option) => ({
            value: option.value,
            label: t(`ranges.${option.label}`),
          }))}
          value={String(range) as RangeValue}
          onChange={handleRangeChange}
        />
      </div>

      {/* Charts stay LTR in every locale. */}
      <div dir="ltr" className="relative h-60 md:h-80">
        <div
          ref={containerRef}
          aria-hidden
          className={cn("size-full font-mono", (failed || !points) && "invisible")}
        />
        {tooltip && !loading && !failed ? <ChartTooltip tooltip={tooltip} locale={locale} /> : null}
        {loading ? <Skeleton className="absolute inset-0" /> : null}
        {failed ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-fg-muted"
          >
            <p className="flex items-center gap-2">
              <AlertIcon className="text-down" />
              {t("error")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={loadingRange === range}
              onClick={() => {
                if (!libraryFailed) return load(range);
                setLibraryFailed(false);
                setLibraryAttempt((attempt) => attempt + 1);
              }}
            >
              {t("retry")}
            </Button>
          </div>
        ) : null}
      </div>

      {points && !failed && points.length < range ? (
        <p className="text-sm text-fg-muted">{t("limited", { count: String(points.length) })}</p>
      ) : null}

      {summary && !failed ? (
        <p className="sr-only" aria-live="polite">
          {t("summary", {
            days: String(range),
            change: formatPercent(summary.changePct, locale),
            low: formatPrice(summary.low, locale),
            high: formatPrice(summary.high, locale),
          })}
        </p>
      ) : null}
    </Card>
  );
}

function withoutRange(ranges: ReadonlySet<ChartRange>, range: ChartRange): ReadonlySet<ChartRange> {
  if (!ranges.has(range)) return ranges;
  const next = new Set(ranges);
  next.delete(range);
  return next;
}

type ChartTooltipProps = { tooltip: Tooltip; locale: Locale };

const TOOLTIP_HALF_WIDTH = 64;

/** Date and price at the crosshair, kept inside the chart. Decorative: the summary is the text. */
function ChartTooltip({ tooltip, locale }: ChartTooltipProps) {
  const center = Math.min(
    Math.max(tooltip.x, TOOLTIP_HALF_WIDTH),
    tooltip.width - TOOLTIP_HALF_WIDTH,
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-2 z-10 flex w-32 -translate-x-1/2 flex-col items-center gap-0.5 rounded-md border border-glass-border-strong bg-surface-2 px-2 py-1.5 text-xs shadow-glass"
      style={{ insetInlineStart: center }}
    >
      <bdi dir={getDir(locale)} className="text-fg-muted">
        {formatShortDate(tooltip.date, locale, { withYear: true })}
      </bdi>
      <span className="font-mono font-medium text-fg tabular-nums">
        {formatPrice(tooltip.price, locale)}
      </span>
    </div>
  );
}
