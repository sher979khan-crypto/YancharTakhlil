import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/features/locale-switcher/locale-switcher";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-16 sm:px-8">
      <h1 className="font-display text-3xl leading-tight font-semibold text-balance text-fg sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-prose text-lg text-pretty text-fg-muted">{t("subtitle")}</p>
      <LocaleSwitcher />
    </main>
  );
}
