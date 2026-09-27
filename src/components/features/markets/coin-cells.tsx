import { PriceChange } from "@/components/ui/price-change";
import type { Locale } from "@/lib/i18n/config";
import { NOT_A_NUMBER } from "@/lib/i18n/format";

/** Coin detail pages live at /[locale]/markets/[id]. */
export function coinHref(id: string): string {
  return `/markets/${encodeURIComponent(id)}`;
}

/** A percentage move, or a dash when upstream has no value for this window. */
export function ChangeCell({ value, locale }: { value: number | null; locale: Locale }) {
  if (value === null) return <span className="font-mono text-fg-muted">{NOT_A_NUMBER}</span>;
  return <PriceChange value={value} locale={locale} className="justify-end" />;
}
