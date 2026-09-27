import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

import { glassSurfaceClassName } from "./glass";

export type BadgeTone = "neutral" | "up" | "down" | "brand" | "cosmos" | "ice";

// Tinted fills are translucent (TINT_ALPHA.badge = 12%), so they pick up the glass or surface
// behind them; design-tokens.test.ts checks the text contrast on solid surfaces and on glass.
const toneClasses: Record<BadgeTone, string> = {
  neutral: cn(glassSurfaceClassName, "text-fg-muted"),
  up: "border-up/30 bg-up/12 text-up",
  down: "border-down/30 bg-down/12 text-down",
  brand: "border-brand/30 bg-brand/12 text-brand",
  cosmos: "border-cosmos/30 bg-cosmos/12 text-cosmos",
  ice: "border-ice/30 bg-ice/12 text-ice",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
