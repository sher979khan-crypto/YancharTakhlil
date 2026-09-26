import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

const COINGECKO_URL = "https://www.coingecko.com";

const linkClass =
  "rounded-sm font-medium text-fg underline decoration-fg-subtle underline-offset-4 hover:decoration-brand";

export function SiteFooter() {
  const t = useTranslations("Footer");
  // Server-rendered; static pages pick up the new year on the next build/revalidation.
  const year = String(new Date().getFullYear());

  return (
    <footer className="border-t border-line bg-surface-1">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-fg-muted sm:px-8 md:flex-row md:items-start md:justify-between md:gap-8">
        {/* Attribution wording and link follow CoinGecko's attribution guide. */}
        <p>
          {t.rich("attribution", {
            link: (chunks) => (
              <a
                href={COINGECKO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {chunks}
                <span className="sr-only"> {t("newTab")}</span>
              </a>
            ),
          })}
        </p>
        <p className="md:max-w-sm">
          {t("disclaimerShort")}{" "}
          <Link href="/disclaimer" className={linkClass}>
            {t("disclaimerLink")}
          </Link>
        </p>
        <p>{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
