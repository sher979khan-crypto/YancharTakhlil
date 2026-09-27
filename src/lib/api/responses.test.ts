import * as z from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarketDataError, type MarketDataErrorCode } from "@/lib/domain/errors";

import { ApiErrorSchema, apiSuccessSchema } from "./contract";
import { ApiInputError } from "./params";
import { fail, ok } from "./responses";

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function errorBody(response: Response) {
  return ApiErrorSchema.parse(await response.json());
}

describe("ok", () => {
  it("wraps the result in { data, meta } with CDN cache headers", async () => {
    const response = ok(
      { data: [1, 2], source: "fixture", fetchedAt: "2026-09-26T12:00:00Z", stale: false },
      120,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
    );
    expect(
      apiSuccessSchema(z.array(z.number()))
        .strict()
        .parse(await response.json()),
    ).toEqual({
      data: [1, 2],
      meta: { source: "fixture", fetchedAt: "2026-09-26T12:00:00Z", stale: false },
    });
  });
});

describe("fail", () => {
  it.each<[MarketDataErrorCode, number, string]>([
    ["NOT_FOUND", 404, "NOT_FOUND"],
    ["RATE_LIMITED", 503, "RATE_LIMITED"],
    ["UPSTREAM", 502, "UPSTREAM_ERROR"],
    ["INVALID_RESPONSE", 502, "UPSTREAM_ERROR"],
    ["CONFIG", 500, "CONFIG_ERROR"],
  ])("maps MarketDataError %s to %i %s", async (marketCode, status, code) => {
    const response = fail(new MarketDataError(marketCode, "upstream said https://x/?key=secret"));
    expect(response.status).toBe(status);
    const body = await errorBody(response);
    expect(body.error.code).toBe(code);
    expect(body.error.message).not.toContain("secret");
  });

  it("caches 404 briefly and never caches other errors", () => {
    expect(fail(new MarketDataError("NOT_FOUND", "x")).headers.get("cache-control")).toBe(
      "public, s-maxage=60",
    );
    expect(fail(new MarketDataError("UPSTREAM", "x")).headers.get("cache-control")).toBe(
      "no-store",
    );
    expect(fail(new ApiInputError("x")).headers.get("cache-control")).toBe("no-store");
  });

  it("sets Retry-After only for RATE_LIMITED", () => {
    expect(fail(new MarketDataError("RATE_LIMITED", "x")).headers.get("retry-after")).toBe("30");
    expect(fail(new MarketDataError("UPSTREAM", "x")).headers.get("retry-after")).toBeNull();
  });

  it("maps invalid input to 400 with its own message, without logging", async () => {
    const response = fail(new ApiInputError("range is required"));
    expect(response.status).toBe(400);
    expect(await errorBody(response)).toEqual({
      error: { code: "INVALID_INPUT", message: "range is required" },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("maps anything else to a generic 500 and logs it server-side without the stack", async () => {
    const error = new TypeError("boom: cannot read properties of undefined");
    error.cause = new Error("cause detail");
    const response = fail(error);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(ApiErrorSchema.parse(JSON.parse(text))).toEqual({
      error: { code: "INTERNAL", message: "Internal server error" },
    });
    for (const leak of ["boom", "undefined", "cause", "stack"]) expect(text).not.toContain(leak);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(String(consoleError.mock.calls[0]?.[0])).toMatch(/^\[api\] INTERNAL: TypeError: boom/);
  });

  it("treats a stray ZodError (a server-side parse bug) as INTERNAL, not as bad input", () => {
    const zodError = z.number().safeParse("x").error;
    expect(fail(zodError).status).toBe(500);
  });

  it("handles thrown non-errors", async () => {
    expect((await errorBody(fail("oops"))).error.code).toBe("INTERNAL");
    expect(consoleError).toHaveBeenCalledWith("[api] INTERNAL: string");
  });
});
