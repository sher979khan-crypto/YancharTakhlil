import { useTranslations } from "next-intl";

import { ChangeCell } from "@/components/features/markets/coin-cells";
import { CoinLogo } from "@/components/ui/coin-logo";
import { glassSurfaceClassName } from "@/components/ui/glass";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Coin } from "@/lib/domain/market";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

import { MarketDataUnavailable } from "./market-data-unavailable";

type TickerTapeProps = {
  /** Already the ticker's coins (buildTickerItems); null when the top list failed to load. */
  coins: readonly Coin[] | null;
  locale: Locale;
};

/**
 * A scrolling strip of prices. CSS only: the track holds the list twice and the marquee keyframes
 * shift it by half, so the loop is seamless. It pauses on hover and while focused; under reduced
 * motion it stands still and scrolls sideways instead. Items are not links: moving targets are
 * hard to hit.
 */
export function TickerTape({ coins, locale }: TickerTapeProps) {
  const t = useTranslations("Home.ticker");

  if (coins === null) {
    return (
      <section aria-label={t("label")}>
        <MarketDataUnavailable />
      </section>
    );
  }

  return (
    <section
      aria-label={t("label")}
      // Focusable, so keyboard users can stop the tape (focus-within pauses it) and, under reduced
      // motion, scroll it with the arrow keys.
      tabIndex={0}
      className={cn(
        glassSurfaceClassName,
        // A surface, not a blurred panel: the strip adds no backdrop-filter layer. relative makes
        // it the containing block of the sr-only (absolute) spans in the items, so they are
        // clipped with the track instead of widening the page when the track is not transformed.
        "group relative rounded-lg",
        "motion-safe:overflow-hidden",
        // Symmetric edge fades, so they need no RTL variant.
        "motion-safe:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)]",
        "motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:overflow-x-auto",
      )}
    >
      <div
        className={cn(
          "flex w-max motion-safe:animate-marquee",
          "group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]",
        )}
      >
        <TickerList coins={coins} locale={locale} />
        {/* The second copy only completes the loop: hidden from screen readers and when still. */}
        <TickerList coins={coins} locale={locale} duplicate />
      </div>
    </section>
  );
}

type TickerListProps = { coins: readonly Coin[]; locale: Locale; duplicate?: boolean };

function TickerList({ coins, locale, duplicate = false }: TickerListProps) {
  return (
    <ul
      aria-hidden={duplicate || undefined}
      className={cn("flex shrink-0", duplicate && "motion-reduce:hidden")}
    >
      {coins.map((coin) => (
        <li
          key={coin.id}
          className="flex shrink-0 snap-start items-center gap-2 border-e border-glass-border px-4 py-2.5 text-sm"
        >
          <CoinLogo
            src={coin.imageUrl}
            name={coin.name}
            symbol={coin.symbol}
            size={24}
            decorative
          />
          <bdi dir="ltr" className="font-mono font-medium text-fg">
            {coin.symbol}
          </bdi>
          <TickerNumber
            value={coin.priceUsd}
            format="price"
            locale={locale}
            className="text-fg-muted"
          />
          <ChangeCell value={coin.change24hPct} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
