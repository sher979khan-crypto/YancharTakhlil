import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { SpinnerIcon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-fg hover:shadow-glow-brand",
  secondary: "border border-line bg-surface-2 text-fg hover:bg-surface-3",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
};

// Heights: sm 32px, md 40px, lg 48px; all above the 24px WCAG 2.2 target minimum.
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
};

// ComponentProps includes `ref`, which React 19 passes as a regular prop.
export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks while keeping the label readable. */
  loading?: boolean;
};

/** Button styling for elements that must stay links (e.g. a Link that looks like a button). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow] duration-fast ease-snap",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {loading ? <SpinnerIcon /> : null}
      {children}
    </button>
  );
}
