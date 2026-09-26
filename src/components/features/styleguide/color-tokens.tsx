"use client";

import { useSyncExternalStore } from "react";

import {
  colorTokens,
  contrastPairs,
  textBackgrounds,
  textTokens,
  type ColorToken,
} from "@/config/design-tokens";
import { Badge } from "@/components/ui/badge";
import { contrastRatio, formatRatio, parseHex } from "@/lib/utils/contrast";

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
};

const textClass: Record<(typeof textTokens)[number] | "brand-fg", string> = {
  fg: "text-fg",
  "fg-muted": "text-fg-muted",
  "fg-subtle": "text-fg-subtle",
  up: "text-up",
  down: "text-down",
  brand: "text-brand",
  cosmos: "text-cosmos",
  "brand-fg": "text-brand-fg",
};

// Values are read from the live stylesheet, so this table always reflects globals.css.
function readTokens(): string {
  const style = getComputedStyle(document.documentElement);
  return colorTokens.map((name) => style.getPropertyValue(`--color-${name}`).trim()).join("|");
}

const subscribe = () => () => {};

function useTokenValues(): Map<ColorToken, string> {
  const snapshot = useSyncExternalStore(subscribe, readTokens, () => "");
  const values = snapshot.split("|");
  return new Map(colorTokens.map((name, i) => [name, values[i] ?? ""]));
}

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
  const values = useTokenValues();
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
    </div>
  );
}
