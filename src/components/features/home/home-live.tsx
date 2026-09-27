"use client";

import { useLocale } from "next-intl";
import { useMemo, type ReactNode } from "react";

import { useCoinsPolling } from "@/components/features/markets/use-coins-polling";
import type { Coin, MarketResult } from "@/lib/domain/market";
import { buildTickerItems, buildTopMovers } from "@/lib/domain/market-list";

import { TickerTape } from "./ticker-tape";
import { TopMovers } from "./top-movers";

type HomeLiveProps = {
  initial: MarketResult<Coin[]>;
  /** Rendered between the ticker and the movers (the server-rendered market pulse). */
  children?: ReactNode;
};

/**
 * The live part of the home page: ONE poll of /api/v1/coins feeds both the ticker tape and the
 * top movers. A failed refresh keeps the last data (the markets page shows the error UI).
 */
export function HomeLive({ initial, children }: HomeLiveProps) {
  const locale = useLocale();
  const { result } = useCoinsPolling(initial);
  const tickerCoins = useMemo(() => buildTickerItems(result.data), [result.data]);
  const movers = useMemo(() => buildTopMovers(result.data), [result.data]);

  return (
    <>
      <TickerTape coins={tickerCoins} locale={locale} />
      {children}
      <TopMovers movers={movers} locale={locale} updatedAt={result.fetchedAt} />
    </>
  );
}
