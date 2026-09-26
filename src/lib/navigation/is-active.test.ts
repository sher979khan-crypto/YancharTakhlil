import { describe, expect, it } from "vitest";

import { isActive } from "./is-active";

describe("isActive", () => {
  it("matches home only on the root path", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/markets", "/")).toBe(false);
    expect(isActive("/disclaimer", "/")).toBe(false);
  });

  it("matches a section and its sub-pages", () => {
    expect(isActive("/markets", "/markets")).toBe(true);
    expect(isActive("/markets/", "/markets")).toBe(true);
    expect(isActive("/markets/page/2", "/markets")).toBe(true);
  });

  it("does not match a path that merely shares a prefix", () => {
    expect(isActive("/marketsx", "/markets")).toBe(false);
    expect(isActive("/disclaimer", "/markets")).toBe(false);
  });
});
