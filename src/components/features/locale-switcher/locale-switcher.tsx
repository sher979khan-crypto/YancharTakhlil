"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useId, useTransition, type ChangeEvent } from "react";

import { glassSurfaceClassName } from "@/components/ui/glass";
import { routing } from "@/lib/i18n/routing";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

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
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-fg-muted">
        {t("label")}
      </label>
      {/* fg-subtle border: a form control's edge needs 3:1, which the glass border does not reach.
          Options get a solid fill: some platforms paint the popup with the select's background. */}
      <select
        id={id}
        className={cn(
          glassSurfaceClassName,
          "h-10 rounded-lg border-fg-subtle px-3 text-fg disabled:opacity-50 [&>option]:bg-surface-2",
        )}
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
