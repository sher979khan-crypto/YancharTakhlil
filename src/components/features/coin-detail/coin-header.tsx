"use client";

import { useLocale, useTranslations } from "next-intl";

import {
  PollErrorNotice,
  SourceBadge,
  StaleNotice,
} from "@/components/features/markets/market-status";
import { UpdatedAgo } from "@/components/features/markets/updated-ago";
import { Badge } from "@/components/ui/badge";
import { CoinLogo } from "@/components/ui/coin-logo";
import { DemoBanner } from "@/components/ui/demo-banner";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PriceChange } from "@/components/ui/price-change";
import { TickerNumber } from "@/components/ui/ticker-number";
import { fetchCoinDetail } from "@/lib/api/fetch-coins";
import type { CoinDetail, MarketResult } from "@/lib/domain/market";
import { usePolling } from "@/lib/hooks/use-polling";
import { NOT_A_NUMBER } from "@/lib/i18n/format";

export const COIN_TITLE_ID = "coin-title";

/**
 * The live coin header: polls /api/v1/coins/{id} every cacheTtl.clientPolling seconds (paused
 * while the tab is hidden). Everything that depends on the latest result lives here: price, 24h
 * move, the Demo/Live badge, the demo banner and the stale and error notices.
 */
export function CoinHeader({ initial }: { initial: MarketResult<CoinDetail> }) {
  const t = useTranslations("CoinPage");
  const locale = useLocale();
  const id = initial.data.id;
  const { result, failed, refreshing, retry } = usePolling(
    (signal) => fetchCoinDetail(id, signal),
    initial,
  );
  const coin = result.data;

  return (
    <div className="flex flex-col gap-3">
      {result.source === "fixture" ? <DemoBanner /> : null}

      <GlassPanel
        as="section"
        aria-labelledby={COIN_TITLE_ID}
        strength="strong"
        className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-end md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <CoinLogo
            src={coin.imageUrl}
            name={coin.name}
            symbol={coin.symbol}
            size={64}
            decorative
          />
          <div className="flex min-w-0 flex-col gap-2">
            <h1
              id={COIN_TITLE_ID}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl font-semibold text-fg sm:text-3xl"
            >
              <bdi className="min-w-0 break-words">{coin.name}</bdi>
              <bdi dir="ltr" className="font-mono text-base font-medium text-fg-muted">
                {coin.symbol}
              </bdi>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge tone="ice">
                {t.rich("rank", {
                  rank: String(coin.rank),
                  // "#2" is all neutral characters: without isolation it reads "2#" in Arabic.
                  n: (chunks) => (
                    <bdi dir="ltr" className="font-mono tabular-nums">
                      {chunks}
                    </bdi>
                  ),
                })}
              </Badge>
              <SourceBadge source={result.source} />
              <UpdatedAgo timestamp={result.fetchedAt} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 md:items-end">
          <TickerNumber
            value={coin.priceUsd}
            format="price"
            locale={locale}
            className="text-3xl font-semibold text-fg min-[400px]:text-4xl"
          />
          <p className="flex items-center gap-2 text-sm">
            {coin.change24hPct === null ? (
              <span className="font-mono text-fg-muted">{NOT_A_NUMBER}</span>
            ) : (
              <PriceChange value={coin.change24hPct} locale={locale} />
            )}
            <span className="text-fg-muted">{t("change24h")}</span>
          </p>
        </div>
      </GlassPanel>

      {result.stale ? <StaleNotice /> : null}
      {failed ? <PollErrorNotice refreshing={refreshing} onRetry={retry} /> : null}
    </div>
  );
}
