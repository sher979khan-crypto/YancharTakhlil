import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";

import { AlertIcon } from "./icons";

/**
 * Required whenever market data comes from the fixture (source === "fixture"): demo prices must
 * never pass for real ones. Not dismissible. The 10% amber tint is TINT_ALPHA.banner, covered by
 * design-tokens.test.ts.
 */
export function DemoBanner({ className }: { className?: string }) {
  const t = useTranslations("DemoBanner");

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-medium text-fg",
        "shadow-glass inset-shadow-highlight-soft",
        className,
      )}
    >
      <AlertIcon className="text-base text-brand" />
      <span>{t("label")}</span>
    </div>
  );
}
