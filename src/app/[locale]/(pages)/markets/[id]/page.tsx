import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";

import { AnalystPlaceholder } from "@/components/features/coin-detail/analyst-placeholder";
import { CoinBreadcrumb } from "@/components/features/coin-detail/coin-breadcrumb";
import { CoinHeader } from "@/components/features/coin-detail/coin-header";
import { CoinStats } from "@/components/features/coin-detail/coin-stats";
import { PriceChart } from "@/components/features/coin-detail/price-chart";
import { coinHref } from "@/components/features/markets/coin-cells";
import { CoinIdParamSchema } from "@/lib/api/params";
import { isMarketDataError } from "@/lib/domain/errors";
import type { CoinDetail, MarketResult } from "@/lib/domain/market";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { loadOrNull } from "@/lib/utils/load-or-null";

// On-demand ISR, in seconds: equal to cacheTtl.coinDetail. Next.js reads this statically, so it
// must be a literal. No coin is rendered at build time (99 coins x 3 locales would exhaust the
// API quota): generateStaticParams returns [] and each page is rendered on its first request,
// then cached. Only ids from the current top list render; everything else is a 404.
export const revalidate = 120;
export const dynamicParams = true;

export function generateStaticParams(): { id: string }[] {
  return [];
}

type Props = { params: Promise<{ locale: string; id: string }> };

/**
 * The coin, or null when the id is malformed or not in the top list. Any other failure throws
 * (to [locale]/error.tsx). Cached per request, so metadata and page share one provider call.
 */
const loadCoin = cache(async (rawId: string): Promise<MarketResult<CoinDetail> | null> => {
  const id = CoinIdParamSchema.safeParse(rawId);
  if (!id.success) return null;
  try {
    return await getMarketDataProvider().getCoinDetail(id.data);
  } catch (error) {
    if (isMarketDataError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
});

/** The initial 30-day chart. A failure (or a 404, reported by loadCoin) only empties the chart. */
async function loadChart(rawId: string) {
  const id = CoinIdParamSchema.safeParse(rawId);
  if (!id.success) return null;
  return loadOrNull("coin-page", async () => {
    try {
      return await getMarketDataProvider().getDailyPrices(id.data, 30);
    } catch (error) {
      if (isMarketDataError(error) && error.code === "NOT_FOUND") return null;
      throw error;
    }
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const result = await loadCoin(id);
  if (!result) {
    // The page answers 404: no canonical or alternates for a URL that does not exist.
    const t = await getTranslations("NotFound");
    return { title: t("title"), robots: { index: false } };
  }
  const t = await getTranslations("CoinPage");
  const values = { name: result.data.name, symbol: result.data.symbol };
  return buildPageMetadata({
    locale,
    pathname: coinHref(result.data.id),
    title: t("metaTitle", values),
    description: t("metaDescription", values),
  });
}

export default async function CoinPage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();
  // In parallel; the chart never takes the page down, the coin decides between page and 404.
  const [result, chart] = await Promise.all([loadCoin(id), loadChart(id)]);
  if (!result) notFound();
  const coin = result.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <CoinBreadcrumb name={coin.name} />
      <CoinHeader initial={result} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PriceChart coinId={coin.id} initial={chart} className="lg:col-span-2" />
        <AnalystPlaceholder name={coin.name} />
      </div>
      <CoinStats coin={coin} locale={locale} />
    </div>
  );
}
