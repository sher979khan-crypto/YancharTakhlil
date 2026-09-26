import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "up" | "down" | "brand" | "cosmos";

// Tinted fills are 12% of the tone; design-tokens.test.ts checks the text contrast on them.
const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-fg-muted",
  up: "border-up/30 bg-up/12 text-up",
  down: "border-down/30 bg-down/12 text-down",
  brand: "border-brand/30 bg-brand/12 text-brand",
  cosmos: "border-cosmos/30 bg-cosmos/12 text-cosmos",
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
