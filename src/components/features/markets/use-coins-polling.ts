import { fetchCoins } from "@/lib/api/fetch-coins";
import type { Coin, MarketResult } from "@/lib/domain/market";
import { usePolling, type Polling } from "@/lib/hooks/use-polling";

export type CoinsPolling = Polling<MarketResult<Coin[]>>;

/** Keeps the server-rendered top list fresh by polling /api/v1/coins (see usePolling). */
export function useCoinsPolling(initial: MarketResult<Coin[]>): CoinsPolling {
  return usePolling(fetchCoins, initial);
}
