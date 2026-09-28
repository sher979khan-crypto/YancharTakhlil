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

/** Done step (analysis progress). */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3.5 8.5 3 3 6-7" />
    </Icon>
  );
}

/** Neutral marker: a filled dot, so "neutral" does not rely on color either. */
export function DotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
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

/** Price chart (markets). Charts stay LTR, so it does not mirror in RTL. */
export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 2.5v11h12" />
      <path d="m4.5 10 3-3.5 2.5 2 3.5-4.5" />
    </Icon>
  );
}

/** A coin (coin pages). Symmetric. */
export function CoinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
    </Icon>
  );
}

/** Speech bubble (Kotib). The tail sits at the start, so it mirrors in RTL. */
export function ChatIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={cn("rtl:-scale-x-100", className)} {...props}>
      <path d="M2.5 3.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7l-3 2.5v-2.5h-.5a1 1 0 0 1-1-1V3.5Z" />
      <path d="M5.5 6h5M5.5 8.25h3" />
    </Icon>
  );
}

/** Shield with a check (trust, transparency). Symmetric enough not to mirror. */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.75 13 3.5v4c0 3.1-2.1 5.6-5 6.75C5.1 13.1 3 10.6 3 7.5v-4l5-1.75Z" />
      <path d="m5.75 8 1.6 1.6 2.9-3.1" />
    </Icon>
  );
}

/** Globe (languages). Symmetric. */
export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.6 1.7 2.4 3.7 2.4 6S9.6 12.3 8 14C6.4 12.3 5.6 10.3 5.6 8S6.4 3.7 8 2Z" />
    </Icon>
  );
}

/** Database cylinder (data source). Symmetric. */
export function DatabaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="8" cy="3.75" rx="5" ry="1.75" />
      <path d="M3 3.75v8.5c0 .97 2.24 1.75 5 1.75s5-.78 5-1.75v-8.5" />
      <path d="M3 8c0 .97 2.24 1.75 5 1.75S13 8.97 13 8" />
    </Icon>
  );
}

/** Checklist (verified numbers). Checks lead the lines, so it mirrors in RTL like text. */
export function ListChecksIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={cn("rtl:-scale-x-100", className)} {...props}>
      <path d="m2 4 1.25 1.25L5.5 3M2 10.5l1.25 1.25L5.5 9.5" />
      <path d="M8 4.25h6M8 10.75h6" />
    </Icon>
  );
}
