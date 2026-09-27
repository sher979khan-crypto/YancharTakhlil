import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { CrystalConstellationPoster } from "@/components/features/hero/crystal-constellation-poster";
import { buttonClassName } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ChevronIcon } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  const meta = await getTranslations("Metadata");
  return buildPageMetadata({
    locale,
    pathname: "/",
    title: t("metaTitle"),
    description: meta("description"),
  });
}

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-20">
      <div className="flex flex-col items-start gap-6">
        {/* Solid text; the ice glow sits behind it and never lowers its contrast. */}
        <h1 className="font-display text-3xl leading-tight font-semibold text-balance text-fg text-shadow-glow-ice sm:text-5xl">
          {t("title")}
        </h1>
        <GlassPanel strength="strong" className="px-5 py-4">
          <p className="max-w-prose text-lg text-pretty text-fg-muted">{t("subtitle")}</p>
        </GlassPanel>
        <Link href="/markets" className={buttonClassName({ size: "lg" })}>
          {t("exploreMarkets")}
          <ChevronIcon />
        </Link>
      </div>
      <CrystalConstellationPoster className="mx-auto max-w-md lg:max-w-none" />
    </div>
  );
}
