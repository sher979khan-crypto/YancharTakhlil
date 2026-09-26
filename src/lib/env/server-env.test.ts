import { afterEach, describe, expect, it, vi } from "vitest";

import { formatInvalidEnvWarning, parseServerEnv } from "./server-env";

const DEFAULTS = {
  MARKET_DATA_PROVIDER: "auto",
  COINGECKO_API_PLAN: "demo",
  COINGECKO_API_KEY: undefined,
  OPENROUTER_API_KEY_ASSISTANT: undefined,
  OPENROUTER_API_KEY_ANALYST: undefined,
  OPENROUTER_MODEL_ASSISTANT: undefined,
  OPENROUTER_MODEL_ANALYST: undefined,
};

describe("parseServerEnv", () => {
  it("applies defaults to an empty env", () => {
    expect(parseServerEnv({})).toEqual({ env: DEFAULTS, invalid: [] });
  });

  it("treats empty and whitespace-only strings as not set", () => {
    const result = parseServerEnv({
      MARKET_DATA_PROVIDER: "",
      COINGECKO_API_KEY: "",
      COINGECKO_API_PLAN: "   ",
      OPENROUTER_API_KEY_ASSISTANT: "",
    });
    expect(result).toEqual({ env: DEFAULTS, invalid: [] });
  });

  it("reads valid values and trims them", () => {
    const { env, invalid } = parseServerEnv({
      MARKET_DATA_PROVIDER: "fixture",
      COINGECKO_API_KEY: " test-key ",
      COINGECKO_API_PLAN: "pro",
      OPENROUTER_API_KEY_ASSISTANT: "assistant-key",
      OPENROUTER_API_KEY_ANALYST: "analyst-key",
      OPENROUTER_MODEL_ASSISTANT: "vendor/model-a",
      OPENROUTER_MODEL_ANALYST: "vendor/model-b",
    });
    expect(invalid).toEqual([]);
    expect(env).toEqual({
      MARKET_DATA_PROVIDER: "fixture",
      COINGECKO_API_KEY: "test-key",
      COINGECKO_API_PLAN: "pro",
      OPENROUTER_API_KEY_ASSISTANT: "assistant-key",
      OPENROUTER_API_KEY_ANALYST: "analyst-key",
      OPENROUTER_MODEL_ASSISTANT: "vendor/model-a",
      OPENROUTER_MODEL_ANALYST: "vendor/model-b",
    });
  });

  it("reads the CoinGecko plan case-insensitively", () => {
    expect(parseServerEnv({ COINGECKO_API_PLAN: "Demo" }).env.COINGECKO_API_PLAN).toBe("demo");
    expect(parseServerEnv({ COINGECKO_API_PLAN: " PRO " })).toMatchObject({
      env: { COINGECKO_API_PLAN: "pro" },
      invalid: [],
    });
  });

  it("falls back to the default for each invalid value without touching the others", () => {
    const { env, invalid } = parseServerEnv({
      MARKET_DATA_PROVIDER: "coingeko",
      COINGECKO_API_PLAN: "Enterprise",
      COINGECKO_API_KEY: "valid-key",
    });
    expect(invalid).toEqual(["MARKET_DATA_PROVIDER", "COINGECKO_API_PLAN"]);
    expect(env).toMatchObject({
      MARKET_DATA_PROVIDER: "auto",
      COINGECKO_API_PLAN: "demo",
      COINGECKO_API_KEY: "valid-key",
    });
  });

  it("ignores unrelated variables", () => {
    expect(parseServerEnv({ PATH: "/usr/bin", NODE_ENV: "test" }).env).toEqual(DEFAULTS);
  });
});

describe("formatInvalidEnvWarning", () => {
  it("names the variables", () => {
    expect(formatInvalidEnvWarning(["MARKET_DATA_PROVIDER", "COINGECKO_API_PLAN"])).toBe(
      "[env] Invalid value for MARKET_DATA_PROVIDER, COINGECKO_API_PLAN; using the default instead.",
    );
  });
});

describe("getServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function freshGetServerEnv() {
    vi.resetModules();
    return (await import("./server-env")).getServerEnv;
  }

  it("works with no variables set", async () => {
    for (const key of Object.keys(DEFAULTS)) vi.stubEnv(key, "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getServerEnv = await freshGetServerEnv();
    expect(getServerEnv()).toEqual(DEFAULTS);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once, naming the variable but never its value, and caches the result", async () => {
    const secretLookingValue = "sk-should-never-be-logged";
    vi.stubEnv("MARKET_DATA_PROVIDER", secretLookingValue);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getServerEnv = await freshGetServerEnv();

    const first = getServerEnv();
    expect(getServerEnv()).toBe(first);
    expect(first.MARKET_DATA_PROVIDER).toBe("auto");
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("MARKET_DATA_PROVIDER");
    expect(logged).not.toContain(secretLookingValue);
  });
});
