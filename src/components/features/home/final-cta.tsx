import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ChevronIcon } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";

import { SectionHeading } from "./section-heading";

const SECTION_ID = "get-started";
const HEADING_ID = "get-started-title";

/** The closing call to action: one blurred band (with the header pill, 2 blur layers at most). */
export function FinalCta() {
  const t = useTranslations("Home.cta");

  return (
    <GlassPanel
      as="section"
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      strength="strong"
      // The ice glow is an outer shadow, so it never sits under the text.
      className="flex scroll-mt-24 flex-col items-start gap-5 border-ice/30 p-6 shadow-glow-ice sm:p-8 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-2">
        <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
        <p className="text-pretty text-fg-muted">{t("body")}</p>
      </div>
      <Link href="/markets" className={buttonClassName({ size: "lg", className: "shrink-0" })}>
        {t("button")}
        <ChevronIcon />
      </Link>
    </GlassPanel>
  );
}
