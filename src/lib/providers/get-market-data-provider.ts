import "server-only";

import { MarketDataError } from "@/lib/domain/errors";
import { getServerEnv, type ServerEnv } from "@/lib/env/server-env";

import { createCoinGeckoMarketDataProvider } from "./coingecko/coingecko-market-data-provider";
import { createFixtureMarketDataProvider } from "./fixture/fixture-market-data-provider";
import type { MarketDataProvider } from "./market-data-provider";

export type MarketDataSelection = { source: "fixture" } | { source: "coingecko"; apiKey: string };

/**
 * Pure provider choice for an env:
 * - "fixture" → fixture; "auto" → CoinGecko with a key, fixture (demo banner) without one;
 * - "coingecko" without a key throws CONFIG: demo data is never served when real data was asked for.
 */
export function selectMarketDataSource(
  env: Pick<ServerEnv, "MARKET_DATA_PROVIDER" | "COINGECKO_API_KEY">,
): MarketDataSelection {
  const apiKey = env.COINGECKO_API_KEY;
  switch (env.MARKET_DATA_PROVIDER) {
    case "fixture":
      return { source: "fixture" };
    case "auto":
      return apiKey === undefined ? { source: "fixture" } : { source: "coingecko", apiKey };
    case "coingecko":
      if (apiKey === undefined) {
        throw new MarketDataError(
          "CONFIG",
          "MARKET_DATA_PROVIDER is coingecko but COINGECKO_API_KEY is not set",
        );
      }
      return { source: "coingecko", apiKey };
  }
}

let provider: MarketDataProvider | undefined;

/** The market data provider for the current env, created once per server process. */
export function getMarketDataProvider(): MarketDataProvider {
  if (!provider) {
    const env = getServerEnv();
    const selection = selectMarketDataSource(env);
    provider =
      selection.source === "coingecko"
        ? createCoinGeckoMarketDataProvider({
            apiKey: selection.apiKey,
            plan: env.COINGECKO_API_PLAN,
          })
        : createFixtureMarketDataProvider();
  }
  return provider;
}
