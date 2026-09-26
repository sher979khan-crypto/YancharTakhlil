import "server-only";

import type { DataSource } from "@/lib/domain/market";
import { getServerEnv, type ServerEnv } from "@/lib/env/server-env";

import { createFixtureMarketDataProvider } from "./fixture/fixture-market-data-provider";
import type { MarketDataProvider } from "./market-data-provider";

export const COINGECKO_NOT_READY_WARNING =
  "[market-data] CoinGecko adapter arrives in Step 6; using fixture data.";

export type MarketDataSelection = {
  source: DataSource;
  /** Logged once when the env asks for something this build cannot provide yet. */
  warning: string | null;
};

/** Pure provider choice for an env. Until Step 6 every path ends in the fixture provider. */
export function selectMarketDataSource(
  env: Pick<ServerEnv, "MARKET_DATA_PROVIDER" | "COINGECKO_API_KEY">,
): MarketDataSelection {
  const wantsCoinGecko =
    env.MARKET_DATA_PROVIDER === "coingecko" ||
    (env.MARKET_DATA_PROVIDER === "auto" && env.COINGECKO_API_KEY !== undefined);
  return { source: "fixture", warning: wantsCoinGecko ? COINGECKO_NOT_READY_WARNING : null };
}

let provider: MarketDataProvider | undefined;

/** The market data provider for the current env, created once per server process. */
export function getMarketDataProvider(): MarketDataProvider {
  if (!provider) {
    const { warning } = selectMarketDataSource(getServerEnv());
    if (warning) console.warn(warning);
    provider = createFixtureMarketDataProvider();
  }
  return provider;
}
