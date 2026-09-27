import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { GlassPanel } from "@/components/ui/glass-panel";
import { CrystalIcon } from "@/components/ui/icons";
import { thirdPartyNotices } from "@/config/third-party-notices";
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
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <GlassPanel
        as="article"
        strength="strong"
        className="flex max-w-prose flex-col gap-8 p-6 sm:p-10"
      >
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{t("title")}</h1>
          <p className="text-lg text-pretty text-fg">{t("intro")}</p>
        </div>
        {sections.map((key) => (
          <section key={key} className="flex flex-col gap-2 border-t border-glass-border pt-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
              <CrystalIcon className="text-base text-ice" />
              {t(`sections.${key}.title`)}
            </h2>
            <p className="text-pretty text-fg-muted">{t(`sections.${key}.body`)}</p>
          </section>
        ))}
        <section
          aria-labelledby="third-party-notices"
          className="flex flex-col gap-3 border-t border-glass-border pt-6"
        >
          <h2
            id="third-party-notices"
            className="flex items-center gap-2 font-display text-xl font-semibold text-fg"
          >
            <CrystalIcon className="text-base text-ice" />
            {t("notices.title")}
          </h2>
          {thirdPartyNotices.map((notice) => (
            // Legal text in English, as published (CLAUDE.md §9 exception).
            <div key={notice.url} lang="en" dir="ltr" className="flex flex-col gap-1 text-sm">
              <p className="whitespace-pre-line text-fg-muted">{notice.text}</p>
              <a
                href={notice.url}
                className="self-start rounded-sm text-ice underline-offset-4 hover:underline"
              >
                {notice.url}
              </a>
            </div>
          ))}
        </section>
        <p className="border-t border-glass-border pt-6 text-sm text-fg-subtle">
          {t("lastUpdated")}
        </p>
      </GlassPanel>
    </div>
  );
}
