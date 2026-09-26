import { describe, expect, it } from "vitest";

import excludedCoinsJson from "@/data/excluded-coins.json";
import { ExcludedCoinsSchema } from "@/lib/domain/coin-filter";

import { createJsonContentRepository } from "./json-content-repository";

describe("createJsonContentRepository", () => {
  it("returns the validated exclusion list", () => {
    const excluded = createJsonContentRepository().getExcludedCoins();
    expect(ExcludedCoinsSchema.parse(excluded)).toEqual(excluded);
    expect(excluded.stablecoins).toContain("usdt");
    expect(excluded.wrapped).toContain("wbtc");
    expect(excluded.ids).toEqual(expect.arrayContaining(["tether", "usd-coin", "wrapped-bitcoin"]));
    expect(new Set(excluded.ids).size).toBe(excluded.ids.length);
  });

  it("has no duplicate symbols across groups", () => {
    const { stablecoins, wrapped, tokenizedAssets, other } = excludedCoinsJson;
    const all = [...stablecoins, ...wrapped, ...tokenizedAssets, ...other];
    expect(new Set(all).size).toBe(all.length);
  });

  it("returns a copy that callers cannot use to change the shared list", () => {
    const repository = createJsonContentRepository();
    repository.getExcludedCoins().stablecoins.length = 0;
    expect(repository.getExcludedCoins().stablecoins).toContain("usdt");
  });
});
