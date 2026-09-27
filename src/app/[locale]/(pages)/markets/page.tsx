import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { MarketsExplorer } from "@/components/features/markets/markets-explorer";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

// ISR, in seconds: equal to cacheTtl.markets. Next.js reads this statically, so it must be a
// literal (an imported constant or expression is not allowed here).
export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Markets");
  return buildPageMetadata({
    locale,
    pathname: "/markets",
    title: t("metaTitle"),
    description: t("description"),
  });
}

export default async function MarketsPage() {
  const t = await getTranslations("Markets");
  // A provider failure throws to [locale]/error.tsx; there is no notFound() on this page.
  const initial = await getMarketDataProvider().getTopCoins();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{t("title")}</h1>
        <p className="max-w-prose text-fg-muted">{t("description")}</p>
      </div>
      <MarketsExplorer initial={initial} />
    </div>
  );
}
