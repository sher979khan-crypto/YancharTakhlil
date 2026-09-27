import { useTranslations } from "next-intl";

import { ChevronIcon } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";

/** Markets › {coin}. The chevron points forward in reading order, so it mirrors in RTL. */
export function CoinBreadcrumb({ name }: { name: string }) {
  const t = useTranslations("CoinPage");
  const nav = useTranslations("Nav");

  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li>
          <Link
            href="/markets"
            className="inline-flex min-h-6 items-center rounded-sm font-medium text-fg-muted underline-offset-4 hover:text-ice hover:underline"
          >
            {nav("markets")}
          </Link>
        </li>
        <li aria-hidden className="flex text-fg-subtle">
          <ChevronIcon />
        </li>
        <li className="min-w-0">
          <span aria-current="page" className="block truncate text-fg">
            <bdi>{name}</bdi>
          </span>
        </li>
      </ol>
    </nav>
  );
}
