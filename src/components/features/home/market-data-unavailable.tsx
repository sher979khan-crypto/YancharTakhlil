import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

/** Stands in for a home section whose market data could not be loaded; the rest of the page stays. */
export function MarketDataUnavailable({ className }: { className?: string }) {
  const t = useTranslations("Home");

  return (
    <Card role="status" className={cn("flex items-start gap-3 text-sm text-fg-muted", className)}>
      <AlertIcon className="mt-0.5 text-base text-brand" />
      <p>{t("dataUnavailable")}</p>
    </Card>
  );
}
