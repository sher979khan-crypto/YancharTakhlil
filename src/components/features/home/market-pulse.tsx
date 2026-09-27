import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { UpdatedAgo } from "@/components/features/markets/updated-ago";
import { StatTile } from "@/components/ui/stat-tile";
import type { GlobalMarket, MarketResult } from "@/lib/domain/market";
import type { Locale } from "@/lib/i18n/config";
import { formatCompactCurrency, formatPercentUnsigned } from "@/lib/i18n/format";

import { MarketDataUnavailable } from "./market-data-unavailable";
import { SectionHeading } from "./section-heading";

const HEADING_ID = "market-pulse-title";

type MarketPulseProps = {
  /** null when the global market data failed to load. */
  result: MarketResult<GlobalMarket> | null;
  locale: Locale;
};

/** Global market figures. Server-rendered and static until the page's next ISR refresh. */
export function MarketPulse({ result, locale }: MarketPulseProps) {
  const t = useTranslations("Home.pulse");

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      {result === null ? (
        <MarketDataUnavailable />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t("marketCap")}
              value={
                <Figure>{formatCompactCurrency(result.data.totalMarketCapUsd, locale)}</Figure>
              }
              change={{ value: result.data.marketCapChange24hPct, locale }}
            />
            <StatTile
              label={t("volume")}
              value={
                <Figure>{formatCompactCurrency(result.data.totalVolume24hUsd, locale)}</Figure>
              }
            />
            <StatTile
              label={t("btcDominance")}
              value={<Figure>{formatPercentUnsigned(result.data.btcDominancePct, locale)}</Figure>}
            />
            <StatTile
              label={t("ethDominance")}
              value={<Figure>{formatPercentUnsigned(result.data.ethDominancePct, locale)}</Figure>}
            />
          </div>
          <UpdatedAgo timestamp={result.fetchedAt} />
        </>
      )}
    </section>
  );
}

/** A static figure: smaller on phones, where two tiles share a row and ar suffixes are long. */
function Figure({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="font-mono text-lg tabular-nums sm:text-2xl">
      {children}
    </bdi>
  );
}
