import { describe, expect, it } from "vitest";

import { buildAlternates, localizedPath } from "./alternates";

const site = "https://yanchar.example";

describe("localizedPath", () => {
  it("prefixes the locale without a trailing slash", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("ar", "/markets")).toBe("/ar/markets");
    expect(localizedPath("uz", "/markets/")).toBe("/uz/markets");
  });
});

describe("buildAlternates", () => {
  it.each(["en", "ar", "uz"] as const)("uses the %s URL as canonical", (locale) => {
    expect(buildAlternates(locale, "/", site).canonical).toBe(`${site}/${locale}`);
  });

  it("lists every locale plus x-default pointing at /en", () => {
    expect(buildAlternates("ar", "/", site).languages).toEqual({
      en: `${site}/en`,
      ar: `${site}/ar`,
      uz: `${site}/uz`,
      "x-default": `${site}/en`,
    });
  });

  it("handles nested paths", () => {
    const result = buildAlternates("uz", "/markets/page/2", site);
    expect(result.canonical).toBe(`${site}/uz/markets/page/2`);
    expect(result.languages).toEqual({
      en: `${site}/en/markets/page/2`,
      ar: `${site}/ar/markets/page/2`,
      uz: `${site}/uz/markets/page/2`,
      "x-default": `${site}/en/markets/page/2`,
    });
  });
});
