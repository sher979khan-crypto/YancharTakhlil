import { useLocale, useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/features/locale-switcher/locale-switcher";
import { formatCompactCurrency, formatPercent, formatPrice } from "@/lib/i18n/format";

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();

  const samples = [
    formatPrice(64250.5, locale),
    formatPrice(0.00001234, locale),
    formatPercent(2.5, locale),
    formatPercent(-1.2, locale),
    formatCompactCurrency(1234567890123, locale),
  ];

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>{t("Home.title")}</h1>
      <p>{t("Home.subtitle")}</p>
      <LocaleSwitcher />
      <section>
        <h2>{t("FormatPreview.heading")}</h2>
        <ul className="ps-4">
          {samples.map((sample) => (
            <li key={sample}>
              <bdi>{sample}</bdi>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
