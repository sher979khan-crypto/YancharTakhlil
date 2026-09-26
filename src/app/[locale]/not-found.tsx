import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

// Rendered for notFound() anywhere under [locale], including unknown paths via [...rest].
export default function NotFoundPage() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-8">
      <p className="font-mono text-5xl font-medium text-brand tabular-nums">
        <bdi>404</bdi>
      </p>
      <h1 className="font-display text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="max-w-prose text-fg-muted">{t("description")}</p>
      <Link href="/" className={buttonClassName({ className: "mt-2" })}>
        {t("backHome")}
      </Link>
    </div>
  );
}
