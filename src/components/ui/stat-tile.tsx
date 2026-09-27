import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

import { glassSurfaceClassName } from "./glass";
import { PriceChange } from "./price-change";

export type StatTileProps = {
  label: ReactNode;
  /** Usually a TickerNumber. */
  value: ReactNode;
  /** Optional percentage move shown under the value. */
  change?: Readonly<{ value: number; locale: Locale }>;
  className?: string;
};

/** Glass tile for a single figure. Glass look without blur, so a row of tiles costs no layers. */
export function StatTile({ label, value, change, className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg p-4", glassSurfaceClassName, className)}>
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-2xl font-medium text-fg">{value}</span>
      {change ? (
        <PriceChange value={change.value} locale={change.locale} className="text-sm" />
      ) : null}
    </div>
  );
}
