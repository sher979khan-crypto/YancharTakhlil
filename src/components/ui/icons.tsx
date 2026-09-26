import type { SVGProps } from "react";

import { cn } from "@/lib/utils/cn";

export type IconProps = SVGProps<SVGSVGElement>;

// Icons are decorative by default: the text next to them carries the meaning. Pass
// aria-hidden={false} plus a label only for a standalone icon.
function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn("inline-block shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Price went up. Vertical, so it never mirrors in RTL. */
export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
    </Icon>
  );
}

/** Price went down. Vertical, so it never mirrors in RTL. */
export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />
    </Icon>
  );
}

/** Flat price: a dash, so "no change" does not rely on color either. */
export function DashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 8h9" />
    </Icon>
  );
}

type ChevronProps = IconProps & {
  /** Logical direction: "end" points forward in reading order (right in LTR, left in RTL). */
  direction?: "start" | "end";
};

/** Drawn pointing right (= "end" in LTR); flipped for "start" and again in RTL. */
export function ChevronIcon({ direction = "end", className, ...props }: ChevronProps) {
  return (
    <Icon
      className={cn(
        direction === "start" ? "-scale-x-100 rtl:scale-x-100" : "rtl:-scale-x-100",
        className,
      )}
      {...props}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </Icon>
  );
}

export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={cn("motion-safe:animate-spin", className)} {...props}>
      <path d="M8 2a6 6 0 1 0 6 6" />
    </Icon>
  );
}
