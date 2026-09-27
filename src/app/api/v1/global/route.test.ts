import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createThrowingProvider,
  EXPECTED_ERROR_CACHE,
  PROVIDER_ERROR_CASES,
  providerError,
} from "@/lib/api/__fixtures__/route-test-utils";
import { ApiErrorSchema, GlobalMarketResponseSchema } from "@/lib/api/contract";
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

describe("GET /api/v1/global", () => {
  it("returns the global market in the success envelope", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=600, stale-while-revalidate=3000",
    );
    const body = GlobalMarketResponseSchema.parse(await response.json());
    expect(body.meta.source).toBe("fixture");
  });

  it.each(PROVIDER_ERROR_CASES)("maps %s to %i %s", async (code, status, apiCode) => {
    vi.mocked(getMarketDataProvider).mockReturnValue(createThrowingProvider(providerError(code)));
    const response = await GET();
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe(EXPECTED_ERROR_CACHE[status]);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe(apiCode);
  });

  it("exports only GET", () => {
    expect(Object.keys(route)).toEqual(["GET"]);
  });
});
