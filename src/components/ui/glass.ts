import type { GlassStrength } from "@/config/design-tokens";
import { cn } from "@/lib/utils/cn";

export type { GlassStrength };

/*
 * Two kinds of glass:
 * - Panels (GlassPanel, Card variant="glass", the header pill) blur what is behind them. Each one
 *   is a backdrop-filter layer, and at most 3 may be visible at once (CLAUDE.md §10).
 * - Surfaces (secondary Button, SegmentedControl, SearchInput, StatTile, neutral Badge) look like
 *   glass but never blur: they are small, often repeated, and usually sit on a panel already.
 * Both turn solid under the glass-fallback variant (no backdrop-filter support, or
 * prefers-reduced-transparency: reduce), keeping the same border.
 */

const panelFill: Record<GlassStrength, string> = {
  default: "bg-glass-fill glass-fallback:bg-surface-1",
  strong: "bg-glass-fill-strong glass-fallback:bg-surface-2",
};

/** Blurred glass for floating panels. Radius xl; override it with className. */
export function glassPanelClassName({
  strength = "default",
  className,
}: { strength?: GlassStrength; className?: string } = {}): string {
  return cn(
    "rounded-xl border border-glass-border shadow-glass",
    // Inner sheen: a top-to-bottom highlight painted over the fill.
    "bg-linear-to-b from-glass-highlight to-transparent",
    "backdrop-blur-glass-sm sm:backdrop-blur-glass",
    "glass-fallback:bg-none glass-fallback:backdrop-blur-none",
    panelFill[strength],
    className,
  );
}

/** Glass look without blur, for small repeated controls. */
export const glassSurfaceClassName = cn(
  "border border-glass-border bg-glass-fill-strong bg-linear-to-b from-glass-highlight to-transparent",
  "glass-fallback:bg-surface-2 glass-fallback:bg-none",
);
