import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { CrystalIcon } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";

// Rendered for notFound() anywhere under [locale], including unknown paths via [...rest].
export default function NotFoundPage() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-8">
      <div className="flex items-center gap-4">
        {/* A broken crystal shard: decorative, the heading carries the meaning. */}
        <CrystalIcon className="size-16 -rotate-12 text-ice drop-shadow-glow-ice" />
        <p className="font-mono text-6xl font-medium text-ice tabular-nums text-shadow-glow-ice">
          <bdi>404</bdi>
        </p>
      </div>
      <h1 className="font-display text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="max-w-prose text-fg-muted">{t("description")}</p>
      <Link href="/" className={buttonClassName({ className: "mt-2" })}>
        {t("backHome")}
      </Link>
    </div>
  );
}
