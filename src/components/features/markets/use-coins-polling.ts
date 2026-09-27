import { useCallback, useEffect, useRef, useState } from "react";

import { cacheTtl } from "@/config/cache";
import { fetchCoins, nextPollDelay } from "@/lib/api/fetch-coins";
import type { Coin, MarketResult } from "@/lib/domain/market";

const POLL_INTERVAL_MS = cacheTtl.clientPolling * 1000;

export type CoinsPolling = {
  result: MarketResult<Coin[]>;
  /** The last refresh failed; `result` still holds the last good data. */
  failed: boolean;
  refreshing: boolean;
  /** Refreshes now (the Retry button). */
  retry: () => void;
};

/**
 * Keeps the server-rendered top list fresh by polling /api/v1/coins every
 * cacheTtl.clientPolling seconds. Paused while the tab is hidden; when it becomes visible again
 * an overdue refresh runs at once. A failure keeps the last data. In-flight requests are aborted
 * on unmount and when a newer one starts.
 */
export function useCoinsPolling(initial: MarketResult<Coin[]>): CoinsPolling {
  const [result, setResult] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    // The page was rendered just now (or served from ISR), so the first poll is one interval away.
    let lastAttempt = Date.now();

    function schedule(delay: number) {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(() => void refresh(), delay);
    }

    async function refresh() {
      clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;
      lastAttempt = Date.now();
      setRefreshing(true);
      let next: MarketResult<Coin[]> | null = null;
      try {
        next = await fetchCoins(current.signal);
      } catch {
        // Handled below: the notice and the Retry button replace any error details.
      }
      // Unmounted, or a newer refresh took over: that one owns the state now.
      if (current.signal.aborted) return;
      controller = null;
      setRefreshing(false);
      if (next) setResult(next);
      setFailed(next === null);
      schedule(POLL_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timer);
        return;
      }
      schedule(nextPollDelay(lastAttempt, Date.now(), POLL_INTERVAL_MS));
    }

    refreshRef.current = () => void refresh();
    schedule(POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timer);
      controller?.abort();
      refreshRef.current = null;
    };
  }, []);

  const retry = useCallback(() => refreshRef.current?.(), []);

  return { result, failed, refreshing, retry };
}
