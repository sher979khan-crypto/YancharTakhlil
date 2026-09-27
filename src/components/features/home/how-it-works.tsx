import { useTranslations } from "next-intl";

import { glassSurfaceClassName } from "@/components/ui/glass";
import { cn } from "@/lib/utils/cn";

import { SectionHeading } from "./section-heading";

const SECTION_ID = "how-it-works";
const HEADING_ID = "how-it-works-title";

const STEPS = ["pick", "compute", "explain"] as const;

/**
 * Three numbered steps joined by a thin ice line: vertical on mobile, horizontal from md. The line
 * is each step's ::after, placed with logical insets, so it mirrors in RTL with the steps.
 */
export function HowItWorks() {
  const t = useTranslations("Home.howItWorks");
  const footer = useTranslations("Footer");

  return (
    <section
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      <ol className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={cn(
              "relative flex gap-4 md:flex-col",
              // Every step but the last draws the line to the next one. Mobile: down from under
              // the circle (size-10) to the next step. md: from after the circle to the next
              // column's circle, across the gap (gap-8 = 2rem, minus 0.5rem of air).
              "not-last:pb-8 md:not-last:pb-0",
              "not-last:after:absolute not-last:after:start-[calc(1.25rem-0.5px)] not-last:after:top-12 not-last:after:bottom-2 not-last:after:w-px not-last:after:bg-ice/40",
              "md:not-last:after:start-12 md:not-last:after:-end-6 md:not-last:after:top-5 md:not-last:after:bottom-auto md:not-last:after:h-px md:not-last:after:w-auto",
            )}
          >
            <span
              aria-hidden
              className={cn(
                glassSurfaceClassName,
                "flex size-10 shrink-0 items-center justify-center rounded-full border-ice/40 font-mono text-ice tabular-nums shadow-glow-ice",
              )}
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1.5 pt-1.5 md:pt-0">
              <h3 className="font-medium text-fg">{t(`steps.${step}.title`)}</h3>
              <p className="text-sm text-pretty text-fg-muted">{t(`steps.${step}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-fg-subtle">{footer("disclaimerShort")}</p>
    </section>
  );
}
