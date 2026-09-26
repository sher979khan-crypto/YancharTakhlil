import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

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
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-8">
      <h1 className="font-display text-3xl leading-tight font-semibold text-balance text-fg sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-prose text-lg text-pretty text-fg-muted">{t("subtitle")}</p>
    </div>
  );
}
