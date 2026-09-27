import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketDataError } from "@/lib/domain/errors";

import { loadOrNull } from "./load-or-null";

describe("loadOrNull", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the loaded value", async () => {
    await expect(loadOrNull("test", () => Promise.resolve(42))).resolves.toBe(42);
  });

  it("returns null for a rejection and logs only the name and message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new MarketDataError("UPSTREAM", "CoinGecko returned 502");

    await expect(loadOrNull("home", () => Promise.reject(error))).resolves.toBeNull();
    expect(log).toHaveBeenCalledExactlyOnceWith("[home] MarketDataError: CoinGecko returned 502");
  });

  it("returns null when the loader throws synchronously (e.g. a CONFIG error)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = (): Promise<number> => {
      throw new MarketDataError("CONFIG", "missing key");
    };
    await expect(loadOrNull("home", load)).resolves.toBeNull();
  });

  it("does not log a non-Error value's contents", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(loadOrNull("home", () => Promise.reject("secret-ish"))).resolves.toBeNull();
    expect(log).toHaveBeenCalledExactlyOnceWith("[home] string");
  });
});
