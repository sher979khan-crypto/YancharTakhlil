import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiRequest,
  context,
  createThrowingProvider,
  EXPECTED_ERROR_CACHE,
  PROVIDER_ERROR_CASES,
  providerError,
} from "@/lib/api/__fixtures__/route-test-utils";
import { ApiErrorSchema, CoinChartResponseSchema } from "@/lib/api/contract";
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

const get = (id: string, query: string) =>
  GET(apiRequest(`/api/v1/coins/${id}/chart${query}`), context({ id }));

describe("GET /api/v1/coins/[id]/chart", () => {
  it.each([7, 30, 90])("returns %i ascending daily points", async (range) => {
    const response = await get("bitcoin", `?range=${range}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=1800, stale-while-revalidate=9000",
    );
    const body = CoinChartResponseSchema.parse(await response.json());
    expect(body.data).toHaveLength(range);
    expect(body.meta.source).toBe("fixture");
  });

  it.each(["", "?range=14", "?range=", "?days=30"])(
    "returns 400 INVALID_INPUT for %j without asking the provider",
    async (query) => {
      const response = await get("bitcoin", query);
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("INVALID_INPUT");
      expect(getMarketDataProvider).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for a malformed id and 404 for an unlisted one", async () => {
    expect((await get("BAD_ID", "?range=7")).status).toBe(400);
    expect((await get("tether", "?range=7")).status).toBe(404);
  });

  it.each(PROVIDER_ERROR_CASES)("maps %s to %i %s", async (code, status, apiCode) => {
    vi.mocked(getMarketDataProvider).mockReturnValue(createThrowingProvider(providerError(code)));
    const response = await get("bitcoin", "?range=7");
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe(EXPECTED_ERROR_CACHE[status]);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe(apiCode);
  });

  it("exports only GET", () => {
    expect(Object.keys(route)).toEqual(["GET"]);
  });
});
