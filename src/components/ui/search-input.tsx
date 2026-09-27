import { useId, type ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { glassSurfaceClassName } from "./glass";
import { SearchIcon, XIcon } from "./icons";

export type SearchInputProps = Omit<ComponentProps<"input">, "type"> & {
  /** Visible label. Without it, pass aria-label. */
  label?: string;
  /**
   * Shows a clear button while the (controlled) value is not empty. It needs a client parent,
   * because Server Components cannot pass functions.
   */
  onClear?: () => void;
  /** Screen-reader name of the clear button (SearchInput.clear in the messages). */
  clearLabel?: string;
  /** Classes for the outer wrapper; className goes to the input. */
  containerClassName?: string;
};

/**
 * Glass search field with a leading icon. No "use client": it renders in Server Components
 * (uncontrolled, no clear button) and in Client Components (controlled, with onClear).
 */
export function SearchInput({
  label,
  onClear,
  clearLabel,
  containerClassName,
  className,
  id,
  value,
  disabled,
  ...props
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const showClear =
    onClear !== undefined && clearLabel !== undefined && !disabled && String(value ?? "") !== "";

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          id={inputId}
          type="search"
          value={value}
          disabled={disabled}
          className={cn(
            "h-10 w-full rounded-lg ps-9 text-sm text-fg placeholder:text-fg-subtle",
            glassSurfaceClassName,
            // A form control's edge needs 3:1, which the glass border does not reach.
            "border-fg-subtle",
            showClear ? "pe-10" : "pe-3",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // The native cancel button would duplicate ours and ignores the design.
            "[&::-webkit-search-cancel-button]:appearance-none",
            className,
          )}
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute end-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            <XIcon />
            <span className="sr-only">{clearLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
