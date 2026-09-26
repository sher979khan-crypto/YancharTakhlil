"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useId, useTransition, type ChangeEvent } from "react";

import { routing } from "@/lib/i18n/routing";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!hasLocale(routing.locales, next)) return;
    // usePathname() is locale-free, so the router re-prefixes it with the new locale.
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div>
      <label htmlFor={id}>{t("label")}</label>
      <select
        id={id}
        className="ms-2 rounded border border-current bg-transparent ps-2 pe-2"
        value={locale}
        onChange={handleChange}
        disabled={isPending}
      >
        {routing.locales.map((option) => (
          <option key={option} value={option} lang={option}>
            {t(`locales.${option}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
