"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorProps) {
  const t = useTranslations("Error");

  useEffect(() => {
    // Browser console only; the UI never shows error details.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="max-w-prose text-fg-muted">{t("description")}</p>
      {/* retry() re-fetches and re-renders the segment (Next 16.3 recommends it over reset()). */}
      <Button className="mt-2" onClick={() => retry()}>
        {t("retry")}
      </Button>
    </div>
  );
}
