"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getRelativeTime } from "@/lib/utils/relative-time";

const TICK_MS = 10_000;

// One shared clock. getSnapshot must return the same value until the store says it changed,
// so "now" only moves when the interval (or a new subscriber) updates it.
let now = Date.now();

function subscribe(onChange: () => void): () => void {
  // React re-reads the snapshot right after subscribing, so this refresh needs no onChange call.
  now = Date.now();
  const id = setInterval(() => {
    now = Date.now();
    onChange();
  }, TICK_MS);
  return () => clearInterval(id);
}

const getNow = () => now;
// The server (and hydration) render has no clock, so the label cannot mismatch.
const getServerNow = () => null;

/**
 * "Updated 30s ago", computed in the browser only. The server renders a placeholder, because a
 * relative time depends on the viewer's clock and would differ between server and client.
 * The number is inserted as a string, so Intl never formats it with the ar/uz locale.
 */
export function UpdatedAgo({ timestamp }: { timestamp: string }) {
  const t = useTranslations("Markets.updated");
  const current = useSyncExternalStore(subscribe, getNow, getServerNow);

  if (current === null) return <Skeleton className="h-4 w-32" />;

  const relative = getRelativeTime(Date.parse(timestamp), current);
  const label =
    relative.unit === "justNow" ? t("justNow") : t(relative.unit, { n: String(relative.n) });

  return (
    <time dateTime={timestamp} className="text-sm text-fg-muted">
      {label}
    </time>
  );
}
