import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { glassSurfaceClassName } from "@/components/ui/glass";
import {
  ChartIcon,
  ChatIcon,
  ChevronIcon,
  CoinIcon,
  SparkleIcon,
  type IconProps,
} from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

import { SectionHeading } from "./section-heading";

const SECTION_ID = "features";
const HEADING_ID = "features-title";

/** What exists today links to it; what is coming gets a "Coming soon" badge instead. */
type Feature = { Icon: ComponentType<IconProps> } & (
  | { id: "markets" | "coin"; tone: "ice"; href: string }
  | { id: "analyst" | "assistant"; tone: "cosmos"; href?: undefined }
);

const FEATURES: readonly Feature[] = [
  { id: "markets", Icon: ChartIcon, tone: "ice", href: "/markets" },
  { id: "coin", Icon: CoinIcon, tone: "ice", href: "/markets/bitcoin" },
  { id: "analyst", Icon: SparkleIcon, tone: "cosmos" },
  { id: "assistant", Icon: ChatIcon, tone: "cosmos" },
];

// AI features are cosmos (the AI color); live data features are ice.
const iconTone = {
  ice: "border-ice/30 bg-ice/12 text-ice",
  cosmos: "border-cosmos/30 bg-cosmos/12 text-cosmos",
} as const;

/** What the app does: two features that exist and the two AI agents that are coming. */
export function FeaturesSection() {
  const t = useTranslations("Home.features");

  return (
    <section
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map(({ Icon, ...feature }) => (
          // Glass surfaces without blur: four blurred cards would break the 3-layer budget.
          <li
            key={feature.id}
            className={cn(glassSurfaceClassName, "flex flex-col gap-3 rounded-xl p-5 shadow-glass")}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-lg border text-xl",
                iconTone[feature.tone],
              )}
            >
              <Icon />
            </span>
            <h3 className="font-medium text-fg">{t(`items.${feature.id}.title`)}</h3>
            <p className="text-sm text-pretty text-fg-muted">{t(`items.${feature.id}.body`)}</p>
            <div className="mt-auto pt-1">
              {feature.href === undefined ? (
                <Badge tone="cosmos">{t("comingSoon")}</Badge>
              ) : (
                <Link
                  href={feature.href}
                  // No prefetch: the coin link would render a coin page upstream on every visit.
                  prefetch={false}
                  className="inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-medium text-ice underline-offset-4 hover:underline"
                >
                  {t(`items.${feature.id}.link`)}
                  <ChevronIcon />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
