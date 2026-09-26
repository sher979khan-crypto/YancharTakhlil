import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

const PLACEHOLDER_ROWS = 8;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Markets");
  return buildPageMetadata({
    locale,
    pathname: "/markets",
    title: t("metaTitle"),
    description: t("description"),
  });
}

export default function MarketsPage() {
  const t = useTranslations("Markets");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{t("title")}</h1>
        <p className="max-w-prose text-fg-muted">{t("description")}</p>
        <Badge tone="brand" className="self-start">
          {t("comingSoon")}
        </Badge>
      </div>
      {/* Placeholder for the coin list; the badge above tells users why it is empty. */}
      <Card aria-busy="true" className="flex flex-col divide-y divide-line p-0">
        {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ms-auto h-4 w-20" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
        ))}
      </Card>
    </div>
  );
}
