import { useTranslations } from "next-intl";

import { glassSurfaceClassName } from "@/components/ui/glass";
import { ChevronIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

import { SectionHeading } from "./section-heading";

const SECTION_ID = "faq";
const HEADING_ID = "faq-title";

// Keys of Home.faq.items; the Step 15 knowledge base reuses the same messages.
export const FAQ_ITEM_IDS = ["what", "data", "stablecoins", "ai", "advice", "price"] as const;

/**
 * Native <details>: keyboard and screen-reader support come from the browser, any number of items
 * can be open, and it needs no client JS.
 */
export function Faq() {
  const t = useTranslations("Home.faq");

  return (
    <section
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      <div className={cn(glassSurfaceClassName, "rounded-xl shadow-glass")}>
        {FAQ_ITEM_IDS.map((id) => (
          <details key={id} className="group border-glass-border not-first:border-t">
            <summary
              className={cn(
                "flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3",
                "font-medium text-fg transition-colors duration-fast ease-snap hover:text-ice",
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              {t(`items.${id}.q`)}
              {/*
               * Points to the end while closed and down while open. The icon is already mirrored
               * in RTL (it points left there), so it turns the other way to end up pointing down.
               */}
              <ChevronIcon className="text-fg-muted transition-transform duration-base ease-snap group-open:rotate-90 motion-reduce:transition-none rtl:group-open:-rotate-90" />
            </summary>
            <p className="px-5 pb-5 text-pretty text-fg-muted">{t(`items.${id}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
