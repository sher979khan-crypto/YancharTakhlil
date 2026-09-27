"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBanner } from "@/components/ui/demo-banner";
import { glassSurfaceClassName } from "@/components/ui/glass";
import { AlertIcon } from "@/components/ui/icons";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Coin, MarketResult } from "@/lib/domain/market";
import {
  defaultDirectionFor,
  defaultSortForTab,
  filterBySearch,
  filterByTab,
  MARKET_TABS,
  SORT_KEYS,
  sortCoins,
  type CoinSort,
  type MarketTab,
  type SortDirection,
  type SortKey,
} from "@/lib/domain/market-list";
import { cn } from "@/lib/utils/cn";

import { CoinCards } from "./coin-cards";
import { CoinsTable, columnMessageKey } from "./coins-table";
import { UpdatedAgo } from "./updated-ago";
import { useCoinsPolling } from "./use-coins-polling";

const DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

/**
 * The live top list: search, All/Gainers/Losers, sortable columns, and polling. Renders a table
 * from md up and link cards below it. Everything that depends on the data (source badge, demo
 * banner, stale and error notices) lives here, so it follows each refresh.
 */
export function MarketsExplorer({ initial }: { initial: MarketResult<Coin[]> }) {
  const t = useTranslations("Markets");
  const locale = useLocale();
  const { result, failed, refreshing, retry } = useCoinsPolling(initial);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<MarketTab>("all");
  // Null until the user picks a column: then each tab keeps its own natural order.
  const [userSort, setUserSort] = useState<CoinSort | null>(null);
  const sort = userSort ?? defaultSortForTab(tab);

  const coins = useMemo(
    () => sortCoins(filterByTab(filterBySearch(result.data, query), tab), sort.key, sort.direction),
    [result.data, query, tab, sort.key, sort.direction],
  );

  function handleTabChange(next: MarketTab) {
    setTab(next);
    setUserSort(null);
  }

  function handleSort(key: SortKey) {
    setUserSort(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: defaultDirectionFor(key) },
    );
  }

  const isDemo = result.source === "fixture";

  return (
    <div className="flex flex-col gap-4">
      {isDemo ? <DemoBanner /> : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={isDemo ? "brand" : "up"}>
          {isDemo ? null : (
            <span aria-hidden className="size-1.5 rounded-full bg-up motion-safe:animate-pulse" />
          )}
          {isDemo ? t("source.demo") : t("source.live")}
        </Badge>
        <UpdatedAgo timestamp={result.fetchedAt} />
      </div>

      {result.stale ? (
        <p role="status" className="flex items-start gap-2 text-sm text-brand">
          <AlertIcon className="mt-0.5" />
          <span>{t("stale")}</span>
        </p>
      ) : null}

      {failed ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-down/40 bg-surface-2 px-4 py-2.5 text-sm text-fg"
        >
          <AlertIcon className="text-down" />
          <span className="flex-1">{t("pollError")}</span>
          <Button variant="secondary" size="sm" loading={refreshing} onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <SearchInput
          label={t("search.label")}
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          clearLabel={t("search.clear")}
          autoComplete="off"
          spellCheck={false}
          containerClassName="md:w-72"
        />
        <SegmentedControl
          aria-label={t("tabs.label")}
          options={MARKET_TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))}
          value={tab}
          onChange={handleTabChange}
          className="self-start md:self-auto"
        />
        <div className="flex items-end justify-between gap-3 md:ms-auto">
          <p aria-live="polite" className="text-sm text-fg-muted md:pb-2.5">
            {t("results", { count: String(coins.length) })}
          </p>
          <MobileSortSelect sort={sort} onChange={setUserSort} className="md:hidden" />
        </div>
      </div>

      {coins.length === 0 ? (
        <EmptyState query={query} tab={tab} onClear={() => setQuery("")} />
      ) : (
        <>
          <Card className="hidden p-0 md:block">
            <CoinsTable coins={coins} sort={sort} onSort={handleSort} locale={locale} />
          </Card>
          <div className="md:hidden">
            <CoinCards coins={coins} locale={locale} />
          </div>
        </>
      )}
    </div>
  );
}

type MobileSortSelectProps = {
  sort: CoinSort;
  onChange: (sort: CoinSort) => void;
  className?: string;
};

/** Phones have no column headers, so sorting is a native select (every key, both ways). */
function MobileSortSelect({ sort, onChange, className }: MobileSortSelectProps) {
  const t = useTranslations("Markets");
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const [key = "", direction] = event.target.value.split(":");
    if (isSortKey(key) && (direction === "asc" || direction === "desc")) {
      onChange({ key, direction });
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg-muted">
        {t("sort.label")}
      </label>
      {/* Same control styling as the locale select: fg-subtle edge (3:1) and solid options. */}
      <select
        id={id}
        value={`${sort.key}:${sort.direction}`}
        onChange={handleChange}
        className={cn(
          glassSurfaceClassName,
          "h-10 max-w-48 rounded-lg border-fg-subtle px-3 text-sm text-fg [&>option]:bg-surface-2",
        )}
      >
        {SORT_KEYS.flatMap((key) =>
          DIRECTIONS.map((direction) => (
            <option key={`${key}:${direction}`} value={`${key}:${direction}`}>
              {t(`sort.${direction}`, { column: t(`table.${columnMessageKey[key]}`) })}
            </option>
          )),
        )}
      </select>
    </div>
  );
}

type EmptyStateProps = { query: string; tab: MarketTab; onClear: () => void };

function EmptyState({ query, tab, onClear }: EmptyStateProps) {
  const t = useTranslations("Markets.empty");
  const searching = query.trim() !== "";

  return (
    <Card className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="max-w-prose text-fg-muted">
        {searching
          ? t("search", { query: query.trim() })
          : t(tab === "losers" ? "losers" : "gainers")}
      </p>
      {searching ? (
        <Button variant="secondary" onClick={onClear}>
          {t("clear")}
        </Button>
      ) : null}
    </Card>
  );
}
