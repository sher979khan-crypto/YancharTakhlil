import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { blend, contrastRatio, parseHex, type Rgb } from "@/lib/utils/contrast";

import { colorTokens, contrastPairs, MIN_CONTRAST, parseColorTokens } from "./design-tokens";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const tokens = parseColorTokens(read("../app/globals.css"));

function color(name: string): Rgb {
  const value = tokens.get(name);
  if (!value) throw new Error(`Missing --color-${name} in globals.css`);
  return parseHex(value);
}

describe("design tokens", () => {
  it("defines every token listed in design-tokens.ts, and nothing else", () => {
    expect([...tokens.keys()].sort()).toEqual([...colorTokens].sort());
  });

  it.each(contrastPairs.map((p) => [p.fg, p.bg, p.min] as const))(
    "%s on %s reaches %s:1",
    (fg, bg, min) => {
      expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(min);
    },
  );

  it("focus ring (brand) reaches the UI-component minimum on every surface", () => {
    for (const bg of ["bg", "surface-1", "surface-2", "surface-3"]) {
      expect(contrastRatio(color("brand"), color(bg)), bg).toBeGreaterThanOrEqual(
        MIN_CONTRAST.large,
      );
    }
  });

  // Mirrors the color-mix() percentages used in globals.css and the Badge component.
  it("the grid texture and selection keep text readable", () => {
    const gridLine = blend(color("line"), color("bg"), 0.35);
    for (const fg of ["fg", "fg-muted", "fg-subtle"]) {
      expect(contrastRatio(color(fg), gridLine), fg).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
    }
    const selection = blend(color("brand"), color("bg"), 0.3);
    expect(contrastRatio(color("fg"), selection)).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
  });

  it.each(["up", "down", "brand", "cosmos"])("%s badge text passes on its tinted fill", (tone) => {
    for (const surface of ["bg", "surface-1", "surface-2"]) {
      const fill = blend(color(tone), color(surface), 0.12);
      expect(contrastRatio(color(tone), fill), surface).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
    }
  });

  it("theme-color matches the page background", () => {
    expect(siteConfig.themeColor).toBe(tokens.get("bg"));
  });

  it("the favicon uses the brand and background colors", () => {
    const icon = read("../app/icon.svg").toLowerCase();
    expect(icon).toContain(tokens.get("brand"));
    expect(icon).toContain(tokens.get("bg"));
  });
});
