import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  className?: string;
};

/** Same mark as src/app/icon.svg, drawn with tokens so it follows the theme. */
export function LogoMark({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      aria-hidden
      focusable="false"
      className={cn("size-8 shrink-0 text-brand", className)}
    >
      <rect width="32" height="32" rx="6" className="fill-bg" />
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M10 9l6 7.5 6-7.5M16 16.5V24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** Mark plus wordmark. The brand name is never translated and looks the same in every locale. */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {/* lang="en": screen readers pronounce the Latin name correctly inside Arabic pages. */}
      <span
        lang="en"
        className="font-brand text-base font-semibold tracking-tight whitespace-nowrap text-fg"
      >
        {siteConfig.name}
      </span>
    </span>
  );
}
