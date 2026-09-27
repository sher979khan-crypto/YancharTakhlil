import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { PriceChange } from "@/components/ui/price-change";
import { rangePosition, supplyRatio } from "@/lib/domain/coin-stats";
import type { CoinDetail } from "@/lib/domain/market";
import type { Locale } from "@/lib/i18n/config";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatPercentUnsigned,
  formatPrice,
  formatShortDate,
  NOT_A_NUMBER,
} from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";

type CoinStatsProps = { coin: CoinDetail; locale: Locale };

/**
 * Market cap, price changes, 24h range, supply and ATH/ATL on solid cards. Rendered on the
 * server from the ISR snapshot (at most cacheTtl.coinDetail old); only the header price polls.
 */
export function CoinStats({ coin, locale }: CoinStatsProps) {
  const t = useTranslations("CoinPage");

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Figure label={t("marketCap")}>
          <Num>{formatCompactCurrency(coin.marketCapUsd, locale)}</Num>
        </Figure>
        <Figure label={t("fdv")}>
          <Num>
            {coin.fullyDilutedValuationUsd === null
              ? NOT_A_NUMBER
              : formatCompactCurrency(coin.fullyDilutedValuationUsd, locale)}
          </Num>
        </Figure>
        <Figure label={t("volume24h")}>
          <Num>{formatCompactCurrency(coin.volume24hUsd, locale)}</Num>
        </Figure>
      </dl>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard title={t("priceChanges")}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["change1h", coin.change1hPct],
                ["change24h", coin.change24hPct],
                ["change7d", coin.change7dPct],
                ["change30d", coin.change30dPct],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-sm text-fg-muted">{t(key)}</dt>
                <dd>
                  {value === null ? (
                    <span className="font-mono text-fg-muted">{NOT_A_NUMBER}</span>
                  ) : (
                    <PriceChange value={value} locale={locale} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </StatCard>

        <StatCard title={t("range24h")}>
          <RangeBar coin={coin} locale={locale} />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard title={t("supply")}>
          <SupplyStats coin={coin} locale={locale} />
        </StatCard>
        <StatCard title={t("ath")}>
          <ExtremeStats
            price={coin.athUsd}
            changePct={coin.athChangePct}
            date={coin.athDate}
            priceLabel={t("ath")}
            changeLabel={t("fromAth")}
            locale={locale}
          />
        </StatCard>
        <StatCard title={t("atl")}>
          <ExtremeStats
            price={coin.atlUsd}
            changePct={coin.atlChangePct}
            date={coin.atlDate}
            priceLabel={t("atl")}
            changeLabel={t("fromAtl")}
            locale={locale}
          />
        </StatCard>
      </div>
    </div>
  );
}

/** A formatted number: always LTR, mono and tabular. */
function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("font-mono text-fg tabular-nums", className)}>
      {children}
    </bdi>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-xl font-medium">{children}</dd>
    </Card>
  );
}

function StatCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-medium text-fg">{title}</h2>
      {children}
    </Card>
  );
}

function RangeBar({ coin, locale }: CoinStatsProps) {
  const t = useTranslations("CoinPage");
  const position = rangePosition(coin.low24hUsd, coin.high24hUsd, coin.priceUsd);
  const format = (value: number | null) =>
    value === null ? NOT_A_NUMBER : formatPrice(value, locale);

  return (
    // Low on the left, high on the right in every locale: a scale, like the chart. The bar and its
    // labels share one LTR container, so "low" always sits under the bar's low end; the label text
    // keeps its own direction through <bdi>.
    <div dir="ltr" className="flex flex-col gap-3">
      <div aria-hidden className="relative my-1.5 h-1.5 rounded-full bg-surface-3">
        {position === null ? null : (
          <>
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-ice/60"
              style={{ width: `${position * 100}%` }}
            />
            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-1 bg-ice shadow-glow-ice"
              style={{ insetInlineStart: `${position * 100}%` }}
            />
          </>
        )}
      </div>
      <dl className="flex justify-between gap-4 text-sm">
        <div className="flex flex-col items-start gap-0.5">
          <dt className="text-fg-muted">
            <bdi>{t("low")}</bdi>
          </dt>
          <dd>
            <Num>{format(coin.low24hUsd)}</Num>
          </dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-fg-muted">
            <bdi>{t("high")}</bdi>
          </dt>
          <dd>
            <Num>{format(coin.high24hUsd)}</Num>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function SupplyStats({ coin, locale }: CoinStatsProps) {
  const t = useTranslations("CoinPage");
  const ratio = supplyRatio(coin.circulatingSupply, coin.maxSupply);
  const amount = (value: number | null) =>
    value === null ? NOT_A_NUMBER : `${formatCompactNumber(value, locale)} ${coin.symbol}`;

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 text-sm">
        {(
          [
            ["circulating", coin.circulatingSupply],
            ["total", coin.totalSupply],
            ["max", coin.maxSupply],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-4">
            <dt className="text-fg-muted">{t(key)}</dt>
            <dd>
              <Num>{amount(value)}</Num>
            </dd>
          </div>
        ))}
      </dl>
      {ratio === null ? (
        <p className="text-sm text-fg-muted">{t("noMaxSupply")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {/* The bar fills from the start side, like any progress bar. */}
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-ice" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="text-sm text-fg-muted">
            {t("supplyOfMax", { percent: formatPercentUnsigned(ratio * 100, locale) })}
          </p>
        </div>
      )}
    </div>
  );
}

type ExtremeStatsProps = {
  price: number;
  changePct: number;
  date: string;
  /** Visually the card title already says it; screen readers get it on the value too. */
  priceLabel: string;
  changeLabel: string;
  locale: Locale;
};

function ExtremeStats({
  price,
  changePct,
  date,
  priceLabel,
  changeLabel,
  locale,
}: ExtremeStatsProps) {
  const t = useTranslations("CoinPage");

  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="sr-only">{priceLabel}</dt>
        <dd className="text-xl font-medium">
          <Num>{formatPrice(price, locale)}</Num>
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-fg-muted">{changeLabel}</dt>
        <dd>
          <PriceChange value={changePct} locale={locale} />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-fg-muted">{t("date")}</dt>
        <dd>
          <time dateTime={date} className="text-fg">
            <bdi>{formatShortDate(date, locale, { withYear: true })}</bdi>
          </time>
        </dd>
      </div>
    </dl>
  );
}
