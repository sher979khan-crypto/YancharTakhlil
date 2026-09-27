import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiRequest,
  context,
  createThrowingProvider,
  EXPECTED_ERROR_CACHE,
  PROVIDER_ERROR_CASES,
  providerError,
} from "@/lib/api/__fixtures__/route-test-utils";
import { ApiErrorSchema, CoinDetailResponseSchema } from "@/lib/api/contract";
import { createFixtureMarketDataProvider } from "@/lib/providers/fixture/fixture-market-data-provider";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

vi.mock("@/lib/providers/get-market-data-provider", () => ({ getMarketDataProvider: vi.fn() }));

beforeEach(() => {
  vi.mocked(getMarketDataProvider).mockReturnValue(createFixtureMarketDataProvider());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

import * as route from "./route";

const { GET } = route;

const get = (id: string) => GET(apiRequest(`/api/v1/coins/${id}`), context({ id }));

describe("GET /api/v1/coins/[id]", () => {
  it("returns a listed coin in the success envelope", async () => {
    const response = await get("bitcoin");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
    );
    const body = CoinDetailResponseSchema.parse(await response.json());
    expect(body.data).toMatchObject({ id: "bitcoin", symbol: "BTC", rank: 1 });
    expect(body.meta.source).toBe("fixture");
  });

  it("returns 404 NOT_FOUND for an excluded or unknown coin, cached briefly", async () => {
    for (const id of ["tether", "not-a-coin"]) {
      const response = await get(id);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("NOT_FOUND");
    }
  });

  it("returns 400 INVALID_INPUT for a malformed id without asking the provider", async () => {
    const response = await get("BAD_ID");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("INVALID_INPUT");
    expect(getMarketDataProvider).not.toHaveBeenCalled();
  });

  it.each(PROVIDER_ERROR_CASES)("maps %s to %i %s", async (code, status, apiCode) => {
    vi.mocked(getMarketDataProvider).mockReturnValue(createThrowingProvider(providerError(code)));
    const response = await get("bitcoin");
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe(EXPECTED_ERROR_CACHE[status]);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe(apiCode);
  });

  it("exports only GET", () => {
    expect(Object.keys(route)).toEqual(["GET"]);
  });
});
