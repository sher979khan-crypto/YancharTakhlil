import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { blend, contrastRatio, parseHex, type Rgb } from "@/lib/utils/contrast";

import {
  blendedBackgrounds,
  blendedGlass,
  blurredLineAlpha,
  brightestGlassBackdrop,
  colorTokens,
  contrastPairs,
  MIN_CONTRAST,
  mixTokens,
  parseBlurTokens,
  parseColorTokens,
  parseMixTokens,
  parseMixValue,
  textTokens,
  TINT_ALPHA,
  type ColorToken,
  type MixToken,
  type TokenValues,
} from "./design-tokens";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const css = read("../app/globals.css");
const tokens = parseColorTokens(css);
const mixes = parseMixTokens(css);
const blurs = parseBlurTokens(css);

function color(name: string): Rgb {
  const value = tokens.get(name);
  if (!value) throw new Error(`Missing --color-${name} in globals.css`);
  return parseHex(value);
}

const values: TokenValues = {
  color: (name: ColorToken) => color(name),
  mix: (name: MixToken) => {
    const mix = mixes.get(name);
    if (!mix) throw new Error(`Missing --${name} color-mix() in globals.css`);
    return mix;
  },
  minBlurPx: Math.min(...blurs.values()),
};

const blended = blendedBackgrounds(values);

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

  it.each(["up", "down", "brand", "cosmos", "ice"])(
    "%s badge text passes on its tinted fill",
    (tone) => {
      for (const surface of ["bg", "surface-1", "surface-2"]) {
        const fill = blend(color(tone), color(surface), TINT_ALPHA.badge);
        expect(contrastRatio(color(tone), fill), surface).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
      }
    },
  );

  it("tinted badges pass on blended glass too", () => {
    for (const tone of ["up", "down", "brand", "cosmos", "ice"] as const) {
      for (const { name, rgb } of blended) {
        const fill = blend(color(tone), rgb, TINT_ALPHA.badge);
        expect(contrastRatio(color(tone), fill), `${tone} on ${name}`).toBeGreaterThanOrEqual(
          MIN_CONTRAST.text,
        );
      }
    }
  });

  it("DemoBanner text (fg) passes on its amber tint over glass", () => {
    for (const { name, rgb } of blended) {
      const fill = blend(color("brand"), rgb, TINT_ALPHA.banner);
      expect(contrastRatio(color("fg"), fill), name).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
      expect(contrastRatio(color("brand"), fill), name).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
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

describe("glass tokens", () => {
  it("defines every translucent token as a color-mix()", () => {
    for (const name of mixTokens) expect(mixes.has(name), name).toBe(true);
  });

  it("matches the Glass & Crystal spec", () => {
    expect(mixes.get("glass-fill")).toEqual({ base: "surface-1", alpha: 0.55 });
    expect(mixes.get("glass-fill-strong")).toEqual({ base: "surface-1", alpha: 0.75 });
    expect(mixes.get("glass-border")).toEqual({ base: "white", alpha: 0.12 });
    expect(mixes.get("glass-border-strong")).toEqual({ base: "white", alpha: 0.2 });
    expect(mixes.get("page-glow-ice")).toEqual({ base: "ice", alpha: 0.06 });
    expect(mixes.get("page-glow-brand")).toEqual({ base: "brand", alpha: 0.04 });
    expect(blurs.get("glass-sm")).toBe(8);
    expect(blurs.get("glass")).toBe(16);
  });

  it("blurs the grid below 2% alpha behind glass", () => {
    expect(blurredLineAlpha(8)).toBeCloseTo(0.0997, 3);
    const backdrop = brightestGlassBackdrop(values);
    // Brighter than bare bg (glow), never brighter than a sharp grid line over the glow.
    expect(contrastRatio(backdrop, color("bg"))).toBeGreaterThan(1);
  });

  it("strong glass is darker (safer for text) than default glass", () => {
    expect(contrastRatio(color("fg"), blendedGlass(values, "strong"))).toBeGreaterThanOrEqual(
      contrastRatio(color("fg"), blendedGlass(values, "default")),
    );
  });

  // The core rule: every text token over the brightest blended background it can sit on.
  it.each(textTokens.flatMap((fg) => blended.map(({ name, rgb }) => [fg, name, rgb] as const)))(
    "%s on %s (blended) reaches 4.5:1",
    (fg, _name, rgb) => {
      expect(contrastRatio(color(fg), rgb)).toBeGreaterThanOrEqual(MIN_CONTRAST.text);
    },
  );

  it("form-control edges (fg-subtle) and the focus ring reach 3:1 on glass", () => {
    for (const { name, rgb } of blended) {
      expect(contrastRatio(color("fg-subtle"), rgb), name).toBeGreaterThanOrEqual(
        MIN_CONTRAST.large,
      );
      expect(contrastRatio(color("brand"), rgb), name).toBeGreaterThanOrEqual(MIN_CONTRAST.large);
    }
  });
});

describe("parseMixValue", () => {
  it("accepts token, white and resolved hex bases", () => {
    expect(parseMixValue("color-mix(in srgb, var(--color-surface-1) 55%, transparent)")).toEqual({
      base: "surface-1",
      alpha: 0.55,
    });
    expect(parseMixValue("color-mix(in srgb, white 12%, transparent)")).toEqual({
      base: "white",
      alpha: 0.12,
    });
    expect(parseMixValue(" color-mix(in srgb, #0C1017 7.5%, transparent) ")).toEqual({
      base: "#0c1017",
      alpha: 0.075,
    });
  });

  it("rejects anything else", () => {
    expect(parseMixValue("#0c1017")).toBeNull();
    expect(parseMixValue("color-mix(in oklch, white 12%, transparent)")).toBeNull();
    expect(parseMixValue("color-mix(in srgb, white 12%, black)")).toBeNull();
  });
});
