import { CoinLogo } from "@/components/ui/coin-logo";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Coin } from "@/lib/domain/market";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";

import { ChangeCell, coinHref } from "./coin-cells";

/** Mobile list: one card per coin, and the whole card is the link to its page. */
export function CoinCards({ coins, locale }: { coins: readonly Coin[]; locale: Locale }) {
  return (
    <ul className="flex flex-col gap-2">
      {coins.map((coin) => (
        <li key={coin.id}>
          <Link
            href={coinHref(coin.id)}
            // No prefetch: 99 links would each render a coin page upstream.
            prefetch={false}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface-1 p-3 transition-colors duration-fast ease-snap hover:border-ice/40 hover:bg-surface-2"
          >
            <bdi
              dir="ltr"
              className="w-6 shrink-0 text-end font-mono text-xs text-fg-muted tabular-nums"
            >
              {coin.rank}
            </bdi>
            <CoinLogo
              src={coin.imageUrl}
              name={coin.name}
              symbol={coin.symbol}
              size={40}
              decorative
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <bdi className="truncate font-medium text-fg">{coin.name}</bdi>
              <bdi dir="ltr" className="font-mono text-xs text-fg-muted">
                {coin.symbol}
              </bdi>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
              <TickerNumber
                value={coin.priceUsd}
                format="price"
                locale={locale}
                className="text-fg"
              />
              <ChangeCell value={coin.change24hPct} locale={locale} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
