import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import {
  DatabaseIcon,
  GlobeIcon,
  ListChecksIcon,
  ShieldIcon,
  type IconProps,
} from "@/components/ui/icons";

import { SectionHeading } from "./section-heading";

const SECTION_ID = "why-us";
const HEADING_ID = "why-us-title";

type ReasonId = "data" | "numbers" | "languages" | "transparent";

const REASONS: readonly { id: ReasonId; Icon: ComponentType<IconProps> }[] = [
  { id: "data", Icon: DatabaseIcon },
  { id: "numbers", Icon: ListChecksIcon },
  { id: "languages", Icon: GlobeIcon },
  { id: "transparent", Icon: ShieldIcon },
];

/** Why to trust the app: four short reasons, each with an icon. */
export function WhyUs() {
  const t = useTranslations("Home.why");

  return (
    <section
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <SectionHeading id={HEADING_ID}>{t("title")}</SectionHeading>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map(({ id, Icon }) => (
          <li key={id} className="flex flex-col gap-2 border-s-2 border-ice/40 ps-4">
            <Icon className="text-2xl text-ice" />
            <h3 className="font-medium text-fg">{t(`items.${id}.title`)}</h3>
            <p className="text-sm text-pretty text-fg-muted">{t(`items.${id}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
