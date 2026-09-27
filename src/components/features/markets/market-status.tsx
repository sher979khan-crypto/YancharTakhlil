import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import type { DataSource } from "@/lib/domain/market";

// Status that follows polling (markets list, coin header). Server-safe: no hooks besides
// translations, so the client components that poll can render them with their latest result.

/** "Demo" for fixture data, "Live" (with a pulsing dot) for real data. */
export function SourceBadge({ source }: { source: DataSource }) {
  const t = useTranslations("Markets.source");
  const isDemo = source === "fixture";

  return (
    <Badge tone={isDemo ? "brand" : "up"}>
      {isDemo ? null : (
        <span aria-hidden className="size-1.5 rounded-full bg-up motion-safe:animate-pulse" />
      )}
      {isDemo ? t("demo") : t("live")}
    </Badge>
  );
}

/** The provider served its last good data after a failed upstream refresh. */
export function StaleNotice() {
  const t = useTranslations("Markets");

  return (
    <p role="status" className="flex items-start gap-2 text-sm text-brand">
      <AlertIcon className="mt-0.5" />
      <span>{t("stale")}</span>
    </p>
  );
}

type PollErrorNoticeProps = { refreshing: boolean; onRetry: () => void };

/** The last client refresh failed; the data shown is the last loaded one. */
export function PollErrorNotice({ refreshing, onRetry }: PollErrorNoticeProps) {
  const t = useTranslations("Markets");

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-down/40 bg-surface-2 px-4 py-2.5 text-sm text-fg"
    >
      <AlertIcon className="text-down" />
      <span className="flex-1">{t("pollError")}</span>
      <Button variant="secondary" size="sm" loading={refreshing} onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
