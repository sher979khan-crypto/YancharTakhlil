import { describe, expect, it } from "vitest";

import { getSiteUrl } from "@/config/site";

import sitemap from "./sitemap";

const site = getSiteUrl();

describe("sitemap", () => {
  const entries = sitemap();

  it("lists the 3 public pages in all 3 locales", () => {
    expect(entries.map((entry) => entry.url)).toEqual([
      `${site}/en`,
      `${site}/ar`,
      `${site}/uz`,
      `${site}/en/markets`,
      `${site}/ar/markets`,
      `${site}/uz/markets`,
      `${site}/en/disclaimer`,
      `${site}/ar/disclaimer`,
      `${site}/uz/disclaimer`,
    ]);
  });

  it("gives every entry the same hreflang set for its page", () => {
    const markets = entries.filter((entry) => entry.url.endsWith("/markets"));
    for (const entry of markets) {
      expect(entry.alternates?.languages).toEqual({
        en: `${site}/en/markets`,
        ar: `${site}/ar/markets`,
        uz: `${site}/uz/markets`,
        "x-default": `${site}/en/markets`,
      });
    }
  });
});
