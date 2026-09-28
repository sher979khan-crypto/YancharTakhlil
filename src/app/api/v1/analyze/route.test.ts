import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiRequest,
  createThrowingProvider,
  EXPECTED_ERROR_CACHE,
  PROVIDER_ERROR_CASES,
  providerError,
} from "@/lib/api/__fixtures__/route-test-utils";
import { analyzeCoin } from "@/lib/ai/agents/analyst/analyze-coin";
import type * as AnalyzeCoinModule from "@/lib/ai/agents/analyst/analyze-coin";
import { AiBusyError } from "@/lib/ai/core/errors";
import { ApiErrorSchema, AnalyzeResponseSchema } from "@/lib/api/contract";
import { parseServerEnv } from "@/lib/env/server-env";
import type * as ServerEnvModule from "@/lib/env/server-env";
import { createFixtureMarketDataProvider } from "@/lib/providers/fixture/fixture-market-data-provider";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

vi.mock("@/lib/providers/get-market-data-provider", () => ({ getMarketDataProvider: vi.fn() }));
// No OpenRouter key: the real analyst serves "basic" analyses without any network call.
vi.mock("@/lib/env/server-env", async (importOriginal) => {
  const actual = await importOriginal<typeof ServerEnvModule>();
  return { ...actual, getServerEnv: () => parseServerEnv({}).env };
});
vi.mock("@/lib/ai/agents/analyst/analyze-coin", async (importOriginal) => {
  const actual = await importOriginal<typeof AnalyzeCoinModule>();
  return { ...actual, analyzeCoin: vi.fn(actual.analyzeCoin) };
});

import * as route from "./route";

const { GET } = route;

let ipCounter = 0;

/** Each request gets its own client IP, so the per-IP limits only apply where a test wants them. */
function get(query: string, ip = `198.51.100.${++ipCounter}`) {
  return GET(apiRequest(`/api/v1/analyze${query}`, { headers: { "x-forwarded-for": ip } }));
}

beforeEach(() => {
  vi.mocked(getMarketDataProvider).mockReturnValue(createFixtureMarketDataProvider());
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/v1/analyze", () => {
  it("returns a basic analysis without a key, cached briefly by the CDN", async () => {
    const response = await get("?id=bitcoin&locale=en");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=120",
    );
    const body = AnalyzeResponseSchema.parse(await response.json());
    expect(body.data).toMatchObject({ kind: "basic", model: null, confidence: "low" });
    expect(body.meta).toEqual(body.data.data);
    expect(body.meta.source).toBe("fixture");
  });

  it("caches an ai result for 15 minutes", async () => {
    const basic = AnalyzeResponseSchema.parse(await (await get("?id=bitcoin&locale=en")).json());
    vi.mocked(analyzeCoin).mockResolvedValueOnce({
      ...basic.data,
      kind: "ai",
      model: "m/one:free",
    });
    const response = await get("?id=bitcoin&locale=en");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=900, stale-while-revalidate=300",
    );
  });

  it("passes id, locale and the client IP to the analyst", async () => {
    await get("?id=ethereum&locale=uz", "203.0.113.5");
    expect(analyzeCoin).toHaveBeenLastCalledWith("ethereum", "uz", { ip: "203.0.113.5" });
  });

  it.each([
    ["no parameters", ""],
    ["a missing locale", "?id=bitcoin"],
    ["an unsupported locale", "?id=bitcoin&locale=fr"],
    ["a missing id", "?locale=en"],
    ["a malformed id", "?id=BAD_ID&locale=en"],
  ])("returns 400 INVALID_INPUT for %s without analyzing", async (_label, query) => {
    const response = await get(query);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("INVALID_INPUT");
    expect(analyzeCoin).not.toHaveBeenCalled();
  });

  it("returns 404 NOT_FOUND for an excluded coin, cached briefly", async () => {
    const response = await get("?id=tether&locale=en");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 429 AI_BUSY with Retry-After when the client is over its limit", async () => {
    vi.mocked(analyzeCoin).mockRejectedValueOnce(new AiBusyError(37));
    const response = await get("?id=bitcoin&locale=ar");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe("AI_BUSY");
  });

  it("enforces the real per-IP limit for uncached analyses", async () => {
    const ip = "192.0.2.77";
    for (const id of ["solana", "cardano", "dogecoin"]) {
      expect((await get(`?id=${id}&locale=ar`, ip)).status).toBe(200);
    }
    expect((await get("?id=bitcoin&locale=ar", ip)).status).toBe(429);
    // A cached coin + locale is still served to the same client.
    expect((await get("?id=solana&locale=ar", ip)).status).toBe(200);
  });

  it.each(PROVIDER_ERROR_CASES)("maps provider %s to %i %s", async (code, status, apiCode) => {
    vi.mocked(getMarketDataProvider).mockReturnValue(createThrowingProvider(providerError(code)));
    // A coin + locale no other test has cached.
    const response = await get(
      `?id=error-case-${code.toLowerCase().replaceAll("_", "-")}&locale=en`,
    );
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe(EXPECTED_ERROR_CACHE[status]);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe(apiCode);
  });

  it("exports only GET", () => {
    expect(Object.keys(route)).toEqual(["GET"]);
  });
});
