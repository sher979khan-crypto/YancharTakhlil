import {
  getMoveDirection,
  getPriceDirection,
  type PriceDirection,
} from "@/lib/domain/price-direction";
import { PERCENT_FRACTION_DIGITS } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";
import { getSparklineGeometry } from "@/lib/utils/sparkline-geometry";

const toneClasses: Record<PriceDirection, string> = {
  up: "text-up",
  down: "text-down",
  neutral: "text-fg-muted",
};

export type SparklineProps = {
  /** Prices, oldest first. Null or fewer than two points renders nothing. */
  points: readonly number[] | null;
  /**
   * The 7-day change in percent. It picks the color, so the line always matches the percentage
   * shown next to it; without it, the first and last points decide.
   */
  change?: number | null;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * A tiny trend line. Decorative (aria-hidden): the percentage next to it is the accessible value.
 * Always left to right, also in Arabic, like every chart. No state, so it renders on the server.
 */
export function Sparkline({
  points,
  change = null,
  width = 96,
  height = 32,
  className,
}: SparklineProps) {
  const geometry = points ? getSparklineGeometry(points, width, height) : null;
  if (!geometry || !points) return null;

  const direction =
    change !== null
      ? getPriceDirection(change, PERCENT_FRACTION_DIGITS)
      : getMoveDirection(points[0] ?? 0, points.at(-1) ?? 0);

  return (
    // SVG coordinates never mirror; the LTR wrapper (the <svg> takes no dir) keeps any future
    // text or markers inside it in chart order too. Block-level, so ms-auto can align it. A
    // width class on it scales the line down (the viewBox keeps the aspect ratio).
    <span
      dir="ltr"
      aria-hidden
      className={cn("flex w-fit shrink-0", toneClasses[direction], className)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        focusable="false"
        className="h-auto max-w-full overflow-visible"
      >
        <polygon points={geometry.area} className="fill-current opacity-10" />
        <polyline
          points={geometry.line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
