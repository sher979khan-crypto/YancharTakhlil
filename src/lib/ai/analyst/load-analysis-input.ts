import "server-only";

import type { MarketResult } from "@/lib/domain/market";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";
import type { MarketDataProvider } from "@/lib/providers/market-data-provider";
import { loadOrNull } from "@/lib/utils/load-or-null";

import { buildAnalysisInput, HISTORY_DAYS, type AnalysisInput } from "./analysis-input";

type LoadAnalysisInputOptions = {
  provider?: MarketDataProvider;
  now?: () => Date;
};

/**
 * Loads one coin's AnalysisInput. Detail and the 90-day series are required (NOT_FOUND and other
 * MarketDataErrors propagate); the global market only adds context, so its failure is logged and
 * gives `context: null`. With CoinGecko this is at most 3 upstream calls: the shared markets list,
 * one 90-day market_chart (cached 30 min) and /global (cached 10 min). The result carries the
 * provider's `source`, so a caller can label fixture-based analyses as demo data.
 */
export async function loadAnalysisInput(
  id: string,
  { provider = getMarketDataProvider(), now = () => new Date() }: LoadAnalysisInputOptions = {},
): Promise<MarketResult<AnalysisInput>> {
  // Concurrent loads of the markets list share one upstream request (stale-cache in-flight map).
  const [detail, daily, global] = await Promise.all([
    provider.getCoinDetail(id),
    provider.getDailyPrices(id, HISTORY_DAYS),
    loadOrNull("analysis-input:global", () => provider.getGlobalMarket()),
  ]);
  return {
    data: buildAnalysisInput(detail.data, daily.data, global?.data ?? null, now()),
    source: detail.source,
    fetchedAt: detail.fetchedAt,
    stale: detail.stale || daily.stale || (global?.stale ?? false),
  };
}
