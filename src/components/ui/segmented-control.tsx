"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { nextRovingIndex } from "@/lib/utils/roving-index";

import { glassSurfaceClassName } from "./glass";

export type SegmentedOption<T extends string> = Readonly<{ value: T; label: ReactNode }>;

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/**
 * Single-select pill (ARIA radio group): one tab stop, arrow keys move and select, Home/End jump.
 * Left/Right follow the reading direction, so ArrowLeft moves forward in Arabic.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((option) => option.value === value);
  // With no valid selection the first segment takes the tab stop.
  const tabStop = selected === -1 ? 0 : selected;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const dir = getComputedStyle(event.currentTarget).direction === "rtl" ? "rtl" : "ltr";
    const next = nextRovingIndex(tabStop, event.key, options.length, dir);
    const option = next === null ? undefined : options[next];
    if (next === null || !option) return;
    event.preventDefault();
    refs.current[next]?.focus();
    if (option.value !== value) onChange(option.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1",
        glassSurfaceClassName,
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = index === selected;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => {
              if (!checked) onChange(option.value);
            }}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3.5 text-sm whitespace-nowrap",
              "transition-[background-color,color,box-shadow] duration-fast ease-snap",
              // The active chip is raised (fill, lit edge, shadow) and bolder: not color alone.
              checked
                ? "bg-surface-3 font-semibold text-fg shadow-glass inset-shadow-highlight-soft"
                : "font-medium text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
