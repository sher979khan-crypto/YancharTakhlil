import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { AnalysisPanel } from "@/components/features/analyst/analysis-panel";
import { AnalyzeButton } from "@/components/features/analyst/analyze-button";
import { Expand, usePresence } from "@/components/features/analyst/expand";
import type { Analyses } from "@/components/features/analyst/use-analyses";
import { CoinLogo } from "@/components/ui/coin-logo";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { Sparkline } from "@/components/ui/sparkline";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Coin } from "@/lib/domain/market";
import type { CoinSort, SortKey } from "@/lib/domain/market-list";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

import { ChangeCell, coinHref } from "./coin-cells";

type Column = {
  key: SortKey | "chart" | "ai";
  align: "start" | "end";
  /**
   * Responsive visibility: 1h and the chart from lg, volume from xl, so md never scrolls sideways
   * (ar compact values and single long uz words set wide minimum widths there).
   */
  className?: string;
};

const COLUMNS: readonly Column[] = [
  { key: "rank", align: "end", className: "w-12" },
  { key: "name", align: "start" },
  { key: "price", align: "end" },
  { key: "change1h", align: "end", className: "hidden lg:table-cell" },
  { key: "change24h", align: "end" },
  { key: "change7d", align: "end" },
  { key: "marketCap", align: "end" },
  { key: "volume", align: "end", className: "hidden xl:table-cell" },
  { key: "chart", align: "end", className: "hidden w-28 lg:table-cell" },
  // Always the last column, so it rounds the card's top end corner.
  { key: "ai", align: "end", className: "rounded-se-lg" },
];

export const columnMessageKey = {
  rank: "rank",
  name: "coin",
  price: "price",
  change1h: "change1h",
  change24h: "change24h",
  change7d: "change7d",
  marketCap: "marketCap",
  volume: "volume",
} as const satisfies Record<SortKey, string>;

type CoinsTableProps = {
  coins: readonly Coin[];
  sort: CoinSort;
  onSort: (key: SortKey) => void;
  locale: Locale;
  /** The coin whose analysis panel is open (one at a time), or null. */
  openId: string | null;
  onToggleAnalysis: (id: string) => void;
  analyses: Analyses;
};

/** Id of a coin's analysis region in the table (the cards use their own prefix). */
function panelId(coinId: string): string {
  return `analysis-table-${coinId}`;
}

// Sticky header cells tuck just under the floating header pill (16px offset + 58px pill), so no
// row shows through a gap between them.
// Labels may wrap (e.g. "Last 7 days" on two lines): ar/uz headers are longer than en.
const headerCell =
  "sticky top-18 z-10 bg-surface-1 px-2 py-3 lg:px-3 text-xs font-medium text-fg-muted";
// px-2 below lg and the capped name width: at md every visible column must fit the card
// without scrolling sideways, whatever the locale and however long the coin name.
const bodyCell = "px-2 py-2.5 whitespace-nowrap lg:px-3";

/** Desktop list: a real table on a solid card. Only the coin name is a link, not the row. */
export function CoinsTable({
  coins,
  sort,
  onSort,
  locale,
  openId,
  onToggleAnalysis,
  analyses,
}: CoinsTableProps) {
  const t = useTranslations("Markets.table");
  const analyst = useTranslations("Analyst");

  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">{t("caption")}</caption>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const align = column.align === "end" ? "text-end" : "text-start";
            if (column.key === "chart" || column.key === "ai") {
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(headerCell, align, "tracking-wide uppercase", column.className)}
                >
                  {column.key === "chart" ? t("chart") : analyst("button")}
                </th>
              );
            }
            const key = column.key;
            const active = sort.key === key;
            return (
              <th
                key={key}
                scope="col"
                aria-sort={
                  active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                }
                className={cn(
                  headerCell,
                  align,
                  key === "rank" && "rounded-ss-lg",
                  column.className,
                )}
              >
                <SortButton
                  active={active}
                  direction={sort.direction}
                  align={column.align}
                  onClick={() => onSort(key)}
                >
                  {key === "rank" ? (
                    <>
                      <span aria-hidden>#</span>
                      <span className="sr-only">{t("rank")}</span>
                    </>
                  ) : (
                    t(columnMessageKey[key])
                  )}
                </SortButton>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {coins.map((coin) => (
          <Fragment key={coin.id}>
            <tr className="group transition-colors duration-fast ease-snap focus-within:bg-surface-3 hover:bg-surface-3">
              {/* The first cell draws the row's ice edge on hover/focus, on the start side. */}
              <td
                className={cn(
                  bodyCell,
                  "relative border-t border-line text-end",
                  "before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-ice/70 before:opacity-0",
                  "before:transition-opacity before:duration-fast group-focus-within:before:opacity-100 group-hover:before:opacity-100",
                )}
              >
                <bdi dir="ltr" className="font-mono text-fg-muted tabular-nums">
                  {coin.rank}
                </bdi>
              </td>
              <td className={cn(bodyCell, "border-t border-line")}>
                <div className="flex items-center gap-3">
                  <CoinLogo
                    src={coin.imageUrl}
                    name={coin.name}
                    symbol={coin.symbol}
                    size={32}
                    decorative
                  />
                  <div className="flex max-w-32 min-w-0 flex-col lg:max-w-36 xl:max-w-40">
                    <Link
                      href={coinHref(coin.id)}
                      // No prefetch: 99 visible links would each render a coin page upstream.
                      prefetch={false}
                      // A long name is cut with an ellipsis; the tooltip and the link text keep it whole.
                      title={coin.name}
                      className="block truncate rounded-sm font-medium text-fg underline-offset-4 hover:text-ice hover:underline"
                    >
                      <bdi>{coin.name}</bdi>
                    </Link>
                    <bdi dir="ltr" className="font-mono text-xs text-fg-muted">
                      {coin.symbol}
                    </bdi>
                  </div>
                </div>
              </td>
              <td className={cn(bodyCell, "border-t border-line text-end font-medium text-fg")}>
                <TickerNumber value={coin.priceUsd} format="price" locale={locale} />
              </td>
              <td className={cn(bodyCell, "hidden border-t border-line text-end lg:table-cell")}>
                <ChangeCell value={coin.change1hPct} locale={locale} />
              </td>
              <td className={cn(bodyCell, "border-t border-line text-end")}>
                <ChangeCell value={coin.change24hPct} locale={locale} />
              </td>
              <td className={cn(bodyCell, "border-t border-line text-end")}>
                <ChangeCell value={coin.change7dPct} locale={locale} />
              </td>
              <td className={cn(bodyCell, "border-t border-line text-end text-fg")}>
                <TickerNumber value={coin.marketCapUsd} format="compact" locale={locale} />
              </td>
              <td
                className={cn(
                  bodyCell,
                  "hidden border-t border-line text-end text-fg xl:table-cell",
                )}
              >
                <TickerNumber value={coin.volume24hUsd} format="compact" locale={locale} />
              </td>
              <td className={cn(bodyCell, "hidden border-t border-line py-1.5 lg:table-cell")}>
                {/* ms-auto keeps the line at the end edge in both directions; the SVG is LTR. */}
                <Sparkline
                  points={coin.sparkline7d}
                  change={coin.change7dPct}
                  className="ms-auto"
                />
              </td>
              <td className={cn(bodyCell, "border-t border-line py-1.5 text-end")}>
                <AnalyzeButton
                  coinName={coin.name}
                  expanded={openId === coin.id}
                  controls={panelId(coin.id)}
                  onClick={() => onToggleAnalysis(coin.id)}
                />
              </td>
            </tr>
            <AnalysisRow coin={coin} open={openId === coin.id} analyses={analyses} />
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

type AnalysisRowProps = { coin: Coin; open: boolean; analyses: Analyses };

/** The expandable row under a coin: one cell across every column, holding the panel. */
function AnalysisRow({ coin, open, analyses }: AnalysisRowProps) {
  const present = usePresence(open);
  if (!present) return null;

  return (
    <tr>
      <td colSpan={COLUMNS.length} className="p-0">
        <Expand open={open} id={panelId(coin.id)}>
          <div className="px-2 pb-3 lg:px-3">
            <AnalysisPanel
              variant="list"
              coin={coin}
              state={analyses.get(coin.id)}
              onRetry={() => analyses.analyze(coin.id)}
            />
          </div>
        </Expand>
      </td>
    </tr>
  );
}

type SortButtonProps = {
  active: boolean;
  direction: CoinSort["direction"];
  align: Column["align"];
  onClick: () => void;
  children: ReactNode;
};

function SortButton({ active, direction, align, onClick, children }: SortButtonProps) {
  // Vertical arrows: they point at the order, not along the reading direction, so no mirroring.
  const Arrow = active && direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/sort inline-flex min-h-6 items-center gap-1 rounded-sm tracking-wide uppercase",
        "transition-colors duration-fast ease-snap hover:text-fg",
        align === "end" && "flex-row-reverse",
        active && "text-fg",
      )}
    >
      {children}
      <Arrow
        className={cn(
          "text-[0.875em] transition-opacity duration-fast",
          active ? "text-ice" : "opacity-0 group-hover/sort:opacity-60",
        )}
      />
    </button>
  );
}
