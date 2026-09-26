import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type CardGlow = "brand" | "up" | "down" | "cosmos";

const glowClasses: Record<CardGlow, string> = {
  brand: "shadow-glow-brand",
  up: "shadow-glow-up",
  down: "shadow-glow-down",
  cosmos: "shadow-glow-cosmos",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Soft outer glow; use it only where light carries meaning (price move, focus, AI). */
  glow?: CardGlow;
};

export function Card({ glow, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface-1 p-4",
        glow && glowClasses[glow],
        className,
      )}
      {...props}
    />
  );
}
