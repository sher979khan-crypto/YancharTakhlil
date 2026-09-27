import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { getMonogram } from "@/lib/utils/monogram";

export type CoinLogoSize = 24 | 32 | 40 | 64;

// Full class names so Tailwind's scanner generates them.
const sizeClasses: Record<CoinLogoSize, string> = {
  24: "size-6 text-[0.625rem]",
  32: "size-8 text-xs",
  40: "size-10 text-sm",
  64: "size-16 text-2xl",
};

// The gradient ring is the disc's padding: 1px on small logos, 2px where 1px would look thin.
const ringClasses: Record<CoinLogoSize, string> = {
  24: "p-px",
  32: "p-px",
  40: "p-0.5",
  64: "p-0.5",
};

export type CoinLogoProps = {
  /** CoinGecko image URL (host allowed in src/config/images.ts), or null for the monogram. */
  src: string | null;
  name: string;
  symbol: string;
  size?: CoinLogoSize;
  /** The coin name is visible next to the logo, so assistive tech should skip the logo. */
  decorative?: boolean;
  className?: string;
};

export function CoinLogo({
  src,
  name,
  symbol,
  size = 32,
  decorative = false,
  className,
}: CoinLogoProps) {
  if (src) {
    return (
      <Image
        src={src}
        width={size}
        height={size}
        alt={decorative ? "" : name}
        className={cn("shrink-0 rounded-full", sizeClasses[size], className)}
      />
    );
  }

  return (
    // Gradient ring (ice to amber) around a solid disc: padding shows the ring.
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex shrink-0 rounded-full bg-linear-to-br from-ice to-brand",
        ringClasses[size],
        sizeClasses[size],
        className,
      )}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-surface-2 font-display font-semibold text-fg">
        {getMonogram(symbol, name)}
      </span>
    </span>
  );
}
