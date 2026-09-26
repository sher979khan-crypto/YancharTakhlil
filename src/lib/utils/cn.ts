import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom @theme keys from globals.css that tailwind-merge cannot infer. Without them,
// e.g. "shadow-glow-up" and "shadow-none" would both survive a merge.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ["glow-brand", "glow-up", "glow-down", "glow-cosmos"],
      ease: ["snap"],
      animate: ["shimmer", "flash-up", "flash-down", "roll-up", "roll-down"],
    },
    classGroups: {
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
});

/** Joins class names and lets later Tailwind classes override conflicting earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
