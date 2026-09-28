import { AnalysisPanel } from "@/components/features/analyst/analysis-panel";
import { AnalyzeButton } from "@/components/features/analyst/analyze-button";
import { Expand, usePresence } from "@/components/features/analyst/expand";
import type { Analyses } from "@/components/features/analyst/use-analyses";
import { CoinLogo } from "@/components/ui/coin-logo";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Coin } from "@/lib/domain/market";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";

import { ChangeCell, coinHref } from "./coin-cells";

type CoinCardsProps = {
  coins: readonly Coin[];
  locale: Locale;
  /** The coin whose analysis panel is open (one at a time), or null. */
  openId: string | null;
  onToggleAnalysis: (id: string) => void;
  analyses: Analyses;
};

/** Id of a coin's analysis region in the cards (the table uses its own prefix). */
function panelId(coinId: string): string {
  return `analysis-card-${coinId}`;
}

/**
 * Mobile list: one card per coin. The name and price area is the link to the coin page and the
 * "✦ AI" button sits next to it, so no interactive element is nested in another. The analysis
 * panel expands below the card.
 */
export function CoinCards({ coins, locale, openId, onToggleAnalysis, analyses }: CoinCardsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {coins.map((coin) => (
        <li key={coin.id}>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-1 p-2 transition-colors duration-fast ease-snap has-[a:hover]:border-ice/40 has-[a:hover]:bg-surface-2">
            <Link
              href={coinHref(coin.id)}
              // No prefetch: 99 links would each render a coin page upstream.
              prefetch={false}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1"
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
                size={32}
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
            <AnalyzeButton
              coinName={coin.name}
              expanded={openId === coin.id}
              controls={panelId(coin.id)}
              onClick={() => onToggleAnalysis(coin.id)}
              className="shrink-0"
            />
          </div>
          <CardPanel coin={coin} open={openId === coin.id} analyses={analyses} />
        </li>
      ))}
    </ul>
  );
}

type CardPanelProps = { coin: Coin; open: boolean; analyses: Analyses };

function CardPanel({ coin, open, analyses }: CardPanelProps) {
  const present = usePresence(open);
  if (!present) return null;

  return (
    <Expand open={open} id={panelId(coin.id)}>
      <div className="pt-2">
        <AnalysisPanel
          variant="list"
          coin={coin}
          state={analyses.get(coin.id)}
          onRetry={() => analyses.analyze(coin.id)}
        />
      </div>
    </Expand>
  );
}
