import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SITE_URL, parseSiteUrl, resolveSiteUrl, siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("exposes the brand name", () => {
    expect(siteConfig.name).toBe("Yanchar Takhlil");
  });
});

describe("parseSiteUrl", () => {
  it("returns a valid absolute URL without the trailing slash", () => {
    expect(parseSiteUrl("https://yanchar.example")).toBe("https://yanchar.example");
    expect(parseSiteUrl("https://yanchar.example/")).toBe("https://yanchar.example");
    expect(parseSiteUrl("http://localhost:4000")).toBe("http://localhost:4000");
  });

  it("keeps a base path but drops query and hash", () => {
    expect(parseSiteUrl("https://example.com/app/?x=1#top")).toBe("https://example.com/app");
  });

  it.each([
    "not a url",
    "/relative/path",
    "example.com",
    "ftp://example.com",
    "javascript:alert(1)",
    "",
    "   ",
    undefined,
  ])("rejects %j", (value) => {
    expect(parseSiteUrl(value)).toBeNull();
  });
});

describe("resolveSiteUrl", () => {
  const netlify = "https://example.netlify.app";
  const custom = "https://yanchar.example";

  it("prefers NEXT_PUBLIC_SITE_URL over Netlify's URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: custom, URL: netlify })).toBe(custom);
  });

  it("falls back to Netlify's URL when NEXT_PUBLIC_SITE_URL is missing", () => {
    expect(resolveSiteUrl({ URL: `${netlify}/` })).toBe(netlify);
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "", URL: netlify })).toBe(netlify);
  });

  it("skips an invalid NEXT_PUBLIC_SITE_URL and moves on to Netlify's URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "example.com", URL: netlify })).toBe(netlify);
  });

  it("falls back to localhost when no candidate is valid", () => {
    expect(resolveSiteUrl({})).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "nope", URL: "ftp://x.example" })).toBe(
      DEFAULT_SITE_URL,
    );
  });
});

describe("getSiteUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as Record<symbol, unknown>)[
      Symbol.for("yanchar-takhlil.site-url-fallback-warned")
    ];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function load() {
    return (await import("@/config/site")).getSiteUrl;
  }

  it("reads NEXT_PUBLIC_SITE_URL, then URL, from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("URL", "https://example.netlify.app");
    expect((await load())()).toBe("https://example.netlify.app");
  });

  it("warns once during a production build that falls back to localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const getSiteUrl = await load();
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
    getSiteUrl();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn outside a production build", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("URL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await load())()).toBe(DEFAULT_SITE_URL);
    expect(warn).not.toHaveBeenCalled();
  });
});
