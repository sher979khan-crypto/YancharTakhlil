import { describe, expect, it } from "vitest";

import { cacheTtl } from "@/config/cache";

import { errorCacheControl, successCacheControl } from "./cache-headers";

describe("successCacheControl", () => {
  it("caches on the CDN for the ttl, serves stale for 5x, and makes browsers revalidate", () => {
    expect(successCacheControl(cacheTtl.markets)).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
    );
    expect(successCacheControl(cacheTtl.dailyPrices)).toBe(
      "public, max-age=0, s-maxage=1800, stale-while-revalidate=9000",
    );
  });

  it("takes an explicit stale-while-revalidate (AI analysis)", () => {
    expect(successCacheControl(cacheTtl.aiAnalysis, cacheTtl.aiAnalysisStaleWhileRevalidate)).toBe(
      "public, max-age=0, s-maxage=900, stale-while-revalidate=300",
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects ttl %s", (ttl) => {
    expect(() => successCacheControl(ttl)).toThrow(RangeError);
    expect(() => successCacheControl(60, ttl)).toThrow(RangeError);
  });
});

describe("errorCacheControl", () => {
  it("caches 404 briefly on the CDN", () => {
    expect(errorCacheControl(404)).toBe("public, s-maxage=60");
  });

  it.each([400, 405, 500, 502, 503])("never caches %i", (status) => {
    expect(errorCacheControl(status)).toBe("no-store");
  });
});
