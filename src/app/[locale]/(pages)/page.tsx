import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CrystalConstellationPoster } from "@/components/features/hero/crystal-constellation-poster";
import { HomeLive } from "@/components/features/home/home-live";
import { MarketPulse } from "@/components/features/home/market-pulse";
import { TickerTape } from "@/components/features/home/ticker-tape";
import { TopMovers } from "@/components/features/home/top-movers";
import { buttonClassName } from "@/components/ui/button";
import { DemoBanner } from "@/components/ui/demo-banner";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ChevronIcon } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { loadOrNull } from "@/lib/utils/load-or-null";

// ISR, in seconds: equal to cacheTtl.markets. Next.js reads this statically, so it must be a
// literal (an imported constant or expression is not allowed here).
export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  const meta = await getTranslations("Metadata");
  return buildPageMetadata({
    locale,
    pathname: "/",
    title: t("metaTitle"),
    description: meta("description"),
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  // Each call degrades on its own: market data must never take the home page down. The provider
  // is looked up inside the loader, because selecting it can throw too (CONFIG).
  const [coins, global] = await Promise.all([
    loadOrNull("home", () => getMarketDataProvider().getTopCoins()),
    loadOrNull("home", () => getMarketDataProvider().getGlobalMarket()),
  ]);
  const isDemo = coins?.source === "fixture" || global?.source === "fixture";
  const pulse = <MarketPulse result={global} locale={locale} />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <div className="flex flex-col items-start gap-6">
          {/* Solid text; the ice glow sits behind it and never lowers its contrast. */}
          <h1 className="font-display text-3xl leading-tight font-semibold text-balance text-fg text-shadow-glow-ice sm:text-5xl">
            {t("title")}
          </h1>
          <GlassPanel strength="strong" className="px-5 py-4">
            <p className="max-w-prose text-lg text-pretty text-fg-muted">{t("subtitle")}</p>
          </GlassPanel>
          <Link href="/markets" className={buttonClassName({ size: "lg" })}>
            {t("exploreMarkets")}
            <ChevronIcon />
          </Link>
        </div>
        <CrystalConstellationPoster className="mx-auto max-w-md lg:max-w-none" />
      </div>

      {/* Step 9c adds the content sections below this block. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 sm:px-8">
        {isDemo ? <DemoBanner /> : null}
        {coins ? (
          <HomeLive initial={coins}>{pulse}</HomeLive>
        ) : (
          <>
            <TickerTape coins={null} locale={locale} />
            {pulse}
            <TopMovers movers={null} locale={locale} />
          </>
        )}
      </div>
    </div>
  );
}
