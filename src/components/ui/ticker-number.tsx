"use client";

import { useState } from "react";

import { getMoveDirection, type PriceDirection } from "@/lib/domain/price-direction";
import type { Locale } from "@/lib/i18n/config";
import { formatCompactCurrency, formatPercent, formatPrice } from "@/lib/i18n/format";
import { changedChars } from "@/lib/utils/changed-chars";
import { cn } from "@/lib/utils/cn";

const namedFormats = {
  price: formatPrice,
  percent: formatPercent,
  compact: formatCompactCurrency,
} as const;

export type TickerFormatter = (value: number, locale: Locale) => string;

export type TickerNumberProps = {
  value: number;
  /**
   * A formatter function, or the name of a built-in one. Server Components cannot pass
   * functions to a Client Component, so they must use a name.
   */
  format: keyof typeof namedFormats | TickerFormatter;
  locale: Locale;
  /** Announce every change to screen readers. Off by default: live prices would be noisy. */
  live?: boolean;
  className?: string;
};

type Tick = {
  value: number;
  text: string;
  previousText: string;
  direction: PriceDirection;
  /** Bumped on every change; used as a key so the CSS animations restart. */
  count: number;
};

const flashClass: Record<PriceDirection, string | undefined> = {
  up: "animate-flash-up",
  down: "animate-flash-down",
  neutral: undefined,
};

const rollClass: Record<PriceDirection, string | undefined> = {
  up: "relative motion-safe:animate-roll-up",
  down: "relative motion-safe:animate-roll-down",
  neutral: undefined,
};

/**
 * A live number: on change it flashes in the up/down color for 600ms and the changed digits
 * roll in. Under reduced motion only the color flash remains.
 */
export function TickerNumber({
  value,
  format,
  locale,
  live = false,
  className,
}: TickerNumberProps) {
  const formatter = typeof format === "string" ? namedFormats[format] : format;
  const text = formatter(value, locale);

  const [tick, setTick] = useState<Tick>({
    value,
    text,
    previousText: text,
    direction: "neutral",
    count: 0,
  });

  // Adjusting state during render is React's recommended way to react to a prop change
  // (no effect, no extra paint). Object.is keeps NaN from looping forever.
  if (!Object.is(value, tick.value)) {
    setTick({
      value,
      text,
      previousText: tick.text,
      direction: getMoveDirection(tick.value, value),
      count: tick.count + 1,
    });
  }

  const changed = changedChars(tick.previousText, text);

  return (
    // Formatted numbers carry no bidi marks, so the markup fixes their direction.
    <bdi
      dir="ltr"
      className={cn("font-mono tabular-nums", className)}
      aria-live={live ? "polite" : undefined}
      aria-atomic={live || undefined}
    >
      <span
        key={tick.count}
        aria-hidden
        data-ticker-flash={tick.direction === "neutral" ? undefined : ""}
        className={flashClass[tick.direction]}
      >
        {Array.from(text, (char, i) => (
          <span key={i} className={changed[i] ? rollClass[tick.direction] : undefined}>
            {char}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </bdi>
  );
}
