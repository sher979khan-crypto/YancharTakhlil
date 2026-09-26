import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("exposes the brand name", () => {
    expect(siteConfig.name).toBe("Yanchar Takhlil");
  });
});
