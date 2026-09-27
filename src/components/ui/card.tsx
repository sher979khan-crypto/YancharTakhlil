import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

import { glassPanelClassName } from "./glass";

export type CardGlow = "brand" | "up" | "down" | "cosmos";
export type CardVariant = "solid" | "glass";

const glowClasses: Record<CardGlow, string> = {
  brand: "shadow-glow-brand",
  up: "shadow-glow-up",
  down: "shadow-glow-down",
  cosmos: "shadow-glow-cosmos",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** "solid" (default) for data and tables; "glass" for panels that float over the page. */
  variant?: CardVariant;
  /** Soft outer glow; use it only where light carries meaning (price move, focus, AI). */
  glow?: CardGlow;
};

export function Card({ variant = "solid", glow, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === "glass"
          ? glassPanelClassName({ className: "p-4" })
          : "rounded-lg border border-line bg-surface-1 p-4",
        glow && glowClasses[glow],
        className,
      )}
      {...props}
    />
  );
}
