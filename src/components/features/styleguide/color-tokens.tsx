"use client";

import { useSyncExternalStore } from "react";

import {
  blendedBackgrounds,
  colorTokens,
  contrastPairs,
  mixTokens,
  parseMixValue,
  textBackgrounds,
  textTokens,
  type BlendedBackground,
  type ColorToken,
  type Mix,
  type MixToken,
} from "@/config/design-tokens";
import { Badge } from "@/components/ui/badge";
import { contrastRatio, formatRatio, parseHex, type Rgb } from "@/lib/utils/contrast";

// Full class names so Tailwind's scanner generates them.
const swatchClass: Record<ColorToken, string> = {
  bg: "bg-bg",
  "surface-1": "bg-surface-1",
  "surface-2": "bg-surface-2",
  "surface-3": "bg-surface-3",
  line: "bg-line",
  fg: "bg-fg",
  "fg-muted": "bg-fg-muted",
  "fg-subtle": "bg-fg-subtle",
  brand: "bg-brand",
  "brand-fg": "bg-brand-fg",
  up: "bg-up",
  down: "bg-down",
  cosmos: "bg-cosmos",
  ice: "bg-ice",
};

const textClass: Record<(typeof textTokens)[number] | "brand-fg", string> = {
  fg: "text-fg",
  "fg-muted": "text-fg-muted",
  "fg-subtle": "text-fg-subtle",
  up: "text-up",
  down: "text-down",
  brand: "text-brand",
  cosmos: "text-cosmos",
  ice: "text-ice",
  "brand-fg": "text-brand-fg",
};

const mixProperty = (name: MixToken) =>
  name.startsWith("glass-") ? `--color-${name}` : `--${name}`;

// Values are read from the live stylesheet, so these tables always reflect globals.css. Read on
// body: --grid-line is declared there, the rest inherits from :root.
function readTokens(): string {
  const style = getComputedStyle(document.body);
  const read = (property: string) => style.getPropertyValue(property).trim();
  return [
    ...colorTokens.map((name) => read(`--color-${name}`)),
    ...mixTokens.map((name) => read(mixProperty(name))),
    read("--blur-glass-sm"),
  ].join("|");
}

const subscribe = () => () => {};

type LiveTokens = {
  colors: Map<ColorToken, string>;
  mixes: Map<MixToken, Mix | null>;
  minBlurPx: number;
};

function useTokenValues(): LiveTokens {
  const snapshot = useSyncExternalStore(subscribe, readTokens, () => "");
  const values = snapshot.split("|");
  const colors = new Map(colorTokens.map((name, i) => [name, values[i] ?? ""]));
  const mixes = new Map(
    mixTokens.map((name, i) => [name, parseMixValue(values[colorTokens.length + i] ?? "")]),
  );
  const minBlurPx = Number.parseFloat(values[colorTokens.length + mixTokens.length] ?? "");
  return { colors, mixes, minBlurPx };
}

function useBlended({ colors, mixes, minBlurPx }: LiveTokens): BlendedBackground[] | null {
  try {
    return blendedBackgrounds({
      color: (name) => parseHex(colors.get(name) ?? ""),
      mix: (name) => {
        const mix = mixes.get(name);
        if (!mix) throw new Error(name);
        return mix;
      },
      minBlurPx,
    });
  } catch {
    return null;
  }
}

const toHex = (rgb: Rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

function ratio(values: Map<ColorToken, string>, fg: ColorToken, bg: ColorToken): number | null {
  try {
    return contrastRatio(parseHex(values.get(fg) ?? ""), parseHex(values.get(bg) ?? ""));
  } catch {
    return null;
  }
}

function RatioCell({ value, min }: { value: number | null; min: number }) {
  if (value === null) return <span className="text-fg-subtle">…</span>;
  const pass = value >= min;
  return (
    <span className="inline-flex items-center gap-2">
      <bdi className="font-mono tabular-nums">{formatRatio(value)}</bdi>
      <Badge tone={pass ? "up" : "down"}>{pass ? "AA pass" : "fail"}</Badge>
    </span>
  );
}

export function ColorTokens() {
  const live = useTokenValues();
  const values = live.colors;
  const blended = useBlended(live);
  const minFor = (fg: ColorToken, bg: ColorToken) =>
    contrastPairs.find((p) => p.fg === fg && p.bg === bg)?.min ?? 4.5;

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {colorTokens.map((name) => (
          <li key={name} className="overflow-hidden rounded-md border border-line bg-surface-1">
            <div className={`h-14 border-b border-line ${swatchClass[name]}`} />
            <div className="flex flex-col p-2 text-xs">
              <code className="font-mono text-fg">{name}</code>
              <bdi className="font-mono text-fg-muted uppercase">{values.get(name) || "…"}</bdi>
            </div>
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {mixTokens.map((name) => {
          const mix = live.mixes.get(name);
          return (
            <li
              key={name}
              className="flex flex-col rounded-md border border-line bg-surface-1 p-2 text-xs"
            >
              <code className="font-mono text-fg">{name}</code>
              <span className="text-fg-muted">
                {mix ? `${mix.base} at ${Math.round(mix.alpha * 100)}%` : "…"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-xl text-start text-sm">
          <caption className="sr-only">Text contrast per background</caption>
          <thead className="bg-surface-2 text-fg-muted">
            <tr>
              <th scope="col" className="p-3 text-start font-medium">
                Text token
              </th>
              {textBackgrounds.map((bg) => (
                <th key={bg} scope="col" className="p-3 text-start font-medium">
                  on {bg}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {textTokens.map((fg) => (
              <tr key={fg} className="border-t border-line">
                <th scope="row" className={`p-3 text-start font-medium ${textClass[fg]}`}>
                  {fg}
                </th>
                {textBackgrounds.map((bg) => (
                  <td key={bg} className="p-3">
                    <RatioCell value={ratio(values, fg, bg)} min={minFor(fg, bg)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th scope="row" className="p-3 text-start font-medium">
                <span className="rounded-sm bg-brand px-1.5 py-0.5 text-brand-fg">brand-fg</span>
              </th>
              <td className="p-3" colSpan={3}>
                on brand: <RatioCell value={ratio(values, "brand-fg", "brand")} min={4.5} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-xl text-start text-sm">
          <caption className="p-3 text-start text-fg-muted">
            Blended backgrounds at their brightest: the page at the ice/amber glow peak with a grid
            line, and glass (fill + 6% sheen) over that glow with the grid blurred at 8px.
          </caption>
          <thead className="bg-surface-2 text-fg-muted">
            <tr>
              <th scope="col" className="p-3 text-start font-medium">
                Text token
              </th>
              {(blended ?? []).map(({ name, rgb }) => (
                <th key={name} scope="col" className="p-3 text-start font-medium">
                  on {name} <bdi className="font-mono text-xs text-fg-subtle">{toHex(rgb)}</bdi>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {textTokens.map((fg) => (
              <tr key={fg} className="border-t border-line">
                <th scope="row" className={`p-3 text-start font-medium ${textClass[fg]}`}>
                  {fg}
                </th>
                {(blended ?? []).map(({ name, rgb }) => {
                  let value: number | null = null;
                  try {
                    value = contrastRatio(parseHex(values.get(fg) ?? ""), rgb);
                  } catch {
                    value = null;
                  }
                  return (
                    <td key={name} className="p-3">
                      <RatioCell value={value} min={4.5} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
