import { runMarketDataProviderContract } from "../market-data-provider.contract";

import { createFixtureFetch, FIXTURE_NOW, noSleep } from "./__fixtures__/mock-fetch";
import { createCoinGeckoMarketDataProvider } from "./coingecko-market-data-provider";

runMarketDataProviderContract("coingecko (mocked fetch)", () =>
  createCoinGeckoMarketDataProvider({
    apiKey: "test-key-not-real",
    plan: "demo",
    fetchImpl: createFixtureFetch(),
    now: () => FIXTURE_NOW,
    sleep: noSleep,
    log: () => {},
  }),
);
