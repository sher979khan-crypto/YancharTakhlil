import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo/page-metadata";

const sections = [
  "notAdvice",
  "aiWrong",
  "marketData",
  "highRisk",
  "responsibility",
  "noEndorsement",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Disclaimer");
  return buildPageMetadata({
    locale,
    pathname: "/disclaimer",
    title: t("metaTitle"),
    description: t("intro"),
  });
}

export default function DisclaimerPage() {
  const t = useTranslations("Disclaimer");

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{t("title")}</h1>
        <p className="text-lg text-pretty text-fg">{t("intro")}</p>
      </div>
      {sections.map((key) => (
        <section key={key} className="flex flex-col gap-2 border-t border-line pt-6">
          <h2 className="font-display text-xl font-semibold text-fg">
            {t(`sections.${key}.title`)}
          </h2>
          <p className="text-pretty text-fg-muted">{t(`sections.${key}.body`)}</p>
        </section>
      ))}
      <p className="border-t border-line pt-6 text-sm text-fg-subtle">{t("lastUpdated")}</p>
    </article>
  );
}
