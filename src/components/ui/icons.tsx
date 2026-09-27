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

/** Symmetric, so it needs no RTL mirroring. */
export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
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

/** Drawn with the handle toward the bottom-end, so it mirrors in RTL like the text it leads. */
export function SearchIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={cn("rtl:-scale-x-100", className)} {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3.25 3.25" />
    </Icon>
  );
}

/** Clear-input "x". Same glyph as CloseIcon, named for its job. */
export function XIcon(props: IconProps) {
  return <CloseIcon {...props} />;
}

/** AI marker (Kotib, Tahlilchi). Not directional, so it does not mirror in RTL. */
export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 1.75c.4 2.75 1.5 3.85 4.25 4.25C8.5 6.4 7.4 7.5 7 10.25 6.6 7.5 5.5 6.4 2.75 6 5.5 5.6 6.6 4.5 7 1.75Z" />
      <path d="M12.25 9.5v4M10.25 11.5h4" />
    </Icon>
  );
}

/** Faceted crystal shard (404, section markers). */
export function CrystalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5 12.5 6 8 14.5 3.5 6 8 1.5Z" />
      <path d="M3.5 6h9M8 1.5 6.25 6 8 14.5 9.75 6 8 1.5" />
    </Icon>
  );
}

/** Warning triangle (demo-data banner). Symmetric. */
export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.25 14.25 13.25H1.75L8 2.25Z" />
      <path d="M8 6.5v3M8 11.4v.1" />
    </Icon>
  );
}
