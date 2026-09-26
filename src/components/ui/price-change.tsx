import { useTranslations } from "next-intl";

import { getPriceDirection, type PriceDirection } from "@/lib/domain/price-direction";
import type { Locale } from "@/lib/i18n/config";
import { formatPercent, PERCENT_FRACTION_DIGITS } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";

import { ArrowDownIcon, ArrowUpIcon, DashIcon } from "./icons";

const view = {
  up: { Icon: ArrowUpIcon, tone: "text-up", label: "up" },
  down: { Icon: ArrowDownIcon, tone: "text-down", label: "down" },
  neutral: { Icon: DashIcon, tone: "text-fg-muted", label: "unchanged" },
} as const satisfies Record<PriceDirection, unknown>;

export type PriceChangeProps = {
  /** Percentage, e.g. 2.5 for +2.50%. */
  value: number;
  locale: Locale;
  className?: string;
};

/** A percentage move shown with sign, arrow, color and screen-reader text, never color alone. */
export function PriceChange({ value, locale, className }: PriceChangeProps) {
  const t = useTranslations("PriceChange");
  const { Icon, tone, label } = view[getPriceDirection(value, PERCENT_FRACTION_DIGITS)];

  return (
    // Explicit LTR keeps "+2.50%" and its arrow in the same order inside Arabic text.
    <bdi
      dir="ltr"
      className={cn("inline-flex items-center gap-1 font-mono tabular-nums", tone, className)}
    >
      <Icon />
      <span className="sr-only">{t(label)}</span>
      <span>{formatPercent(value, locale)}</span>
    </bdi>
  );
}
