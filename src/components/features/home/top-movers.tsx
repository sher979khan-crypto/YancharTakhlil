import { useTranslations } from "next-intl";

import { ChangeCell, coinHref } from "@/components/features/markets/coin-cells";
import { CoinLogo } from "@/components/ui/coin-logo";
import { glassSurfaceClassName } from "@/components/ui/glass";
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon } from "@/components/ui/icons";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Coin } from "@/lib/domain/market";
import type { TopMovers as TopMoversData } from "@/lib/domain/market-list";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

import { MarketDataUnavailable } from "./market-data-unavailable";
import { SectionHeading } from "./section-heading";

const HEADING_ID = "top-movers-title";

type TopMoversProps = {
  /** From buildTopMovers; null when the top list failed to load. */
  movers: TopMoversData<Coin> | null;
  locale: Locale;
};

/** Top 5 gainers and losers over 24h, side by side from md. */
export function TopMovers({ movers, locale }: TopMoversProps) {
  const t = useTranslations("Home.movers");

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      {movers === null ? (
        <MarketDataUnavailable />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MoversCard kind="gainers" coins={movers.gainers} locale={locale} />
          <MoversCard kind="losers" coins={movers.losers} locale={locale} />
        </div>
      )}
    </section>
  );
}

type MoversCardProps = { kind: "gainers" | "losers"; coins: readonly Coin[]; locale: Locale };

function MoversCard({ kind, coins, locale }: MoversCardProps) {
  const t = useTranslations("Home.movers");
  // Vertical arrows point at the price move, not along the reading direction: no mirroring.
  const Arrow = kind === "gainers" ? ArrowUpIcon : ArrowDownIcon;

  return (
    // A glass surface without blur: next to the header pill and the hero's panel, two blurred
    // cards would make 4 backdrop-filter layers at once (the limit is 3).
    <div className={cn(glassSurfaceClassName, "flex flex-col rounded-xl shadow-glass")}>
      <h3 className="flex items-center gap-2 px-4 pt-4 pb-3 font-medium text-fg">
        <Arrow className={kind === "gainers" ? "text-up" : "text-down"} />
        {t(kind)}
      </h3>
      {coins.length === 0 ? (
        <p className="flex-1 border-t border-glass-border px-4 py-8 text-center text-sm text-fg-muted">
          {t("empty")}
        </p>
      ) : (
        <ol className="flex-1">
          {coins.map((coin) => (
            <MoverRow key={coin.id} coin={coin} locale={locale} />
          ))}
        </ol>
      )}
      <div className="border-t border-glass-border px-4 py-1">
        <Link
          href="/markets"
          className="inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-medium text-ice underline-offset-4 hover:underline"
        >
          {t("viewAll")}
          <ChevronIcon />
        </Link>
      </div>
    </div>
  );
}

function MoverRow({ coin, locale }: { coin: Coin; locale: Locale }) {
  return (
    <li
      className={cn(
        "group relative flex items-center gap-3 border-t border-glass-border px-4 py-2.5",
        "transition-colors duration-fast ease-snap focus-within:bg-surface-3 hover:bg-surface-3",
        // The ice edge on the start side, as in the markets table.
        "before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-ice/70 before:opacity-0",
        "before:transition-opacity before:duration-fast group-focus-within:before:opacity-100 group-hover:before:opacity-100",
      )}
    >
      <CoinLogo src={coin.imageUrl} name={coin.name} symbol={coin.symbol} size={32} decorative />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={coinHref(coin.id)}
          // No prefetch: each link would render a coin page upstream.
          prefetch={false}
          title={coin.name}
          // The ::after stretches the hit area over the whole row (a 40px+ target), while the
          // link text stays the coin name. truncate does not clip it: its containing block is the li.
          className="block truncate rounded-sm font-medium text-fg underline-offset-4 after:absolute after:inset-0 hover:text-ice hover:underline"
        >
          <bdi>{coin.name}</bdi>
        </Link>
        <bdi dir="ltr" className="font-mono text-xs text-fg-muted">
          {coin.symbol}
        </bdi>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
        <TickerNumber value={coin.priceUsd} format="price" locale={locale} className="text-fg" />
        <ChangeCell value={coin.change24hPct} locale={locale} />
      </div>
    </li>
  );
}
