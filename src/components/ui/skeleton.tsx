import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Loading placeholder. Hidden from assistive tech: announce loading on the real region. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md bg-surface-2",
        // The sheen travels in reading direction and is static under reduced motion.
        "bg-linear-to-r from-surface-2 via-surface-3 to-surface-2 bg-size-[200%_100%]",
        "motion-safe:animate-shimmer rtl:[animation-direction:reverse]",
        className,
      )}
      {...props}
    />
  );
}
