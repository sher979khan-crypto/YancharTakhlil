import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { glassSurfaceClassName } from "@/components/ui/glass";
import { SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const TITLE_ID = "analyst-title";

/** Where the Tahlilchi analysis will live. A placeholder only: no button, no request. */
export function AnalystPlaceholder({ name, className }: { name: string; className?: string }) {
  const t = useTranslations("CoinPage.ai");
  const footer = useTranslations("Footer");

  return (
    // A glass surface without blur: the header pill and the coin header already blur.
    <section
      aria-labelledby={TITLE_ID}
      className={cn(
        glassSurfaceClassName,
        "flex flex-col gap-4 rounded-xl border-cosmos/30 p-5 shadow-glow-cosmos",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id={TITLE_ID}
          className="flex items-center gap-2 font-display text-lg font-semibold text-fg"
        >
          <SparkleIcon className="text-xl text-cosmos" />
          {t("title")}
        </h2>
        <Badge tone="cosmos">{t("comingSoon")}</Badge>
      </div>
      <p className="text-pretty text-fg-muted">{t("body", { name })}</p>
      <p className="mt-auto border-t border-glass-border pt-3 text-xs text-fg-subtle">
        {footer("disclaimerShort")}
      </p>
    </section>
  );
}
