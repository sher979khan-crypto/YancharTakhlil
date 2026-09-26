import type { ExcludedCoins } from "@/lib/domain/coin-filter";

/** Static app content. JSON files today; an API or database later. */
export interface ContentRepository {
  getExcludedCoins(): ExcludedCoins;
}
