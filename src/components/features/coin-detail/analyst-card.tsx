"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

import { AnalysisPanel } from "@/components/features/analyst/analysis-panel";
import { useAnalyses } from "@/components/features/analyst/use-analyses";
import { Button } from "@/components/ui/button";
import { glassSurfaceClassName } from "@/components/ui/glass";
import { SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const TITLE_ID = "analyst-title";

type AnalystCardProps = { coin: { id: string; name: string }; className?: string };

/** The coin page's AI Analyst: an intro and one button, then the analysis panel in the card. */
export function AnalystCard({ coin, className }: AnalystCardProps) {
  const t = useTranslations("Analyst");
  const locale = useLocale();
  const analyses = useAnalyses(locale);
  const state = analyses.get(coin.id);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleAnalyze() {
    analyses.analyze(coin.id);
    // The button is replaced by the panel, so focus moves there instead of to the page body.
    panelRef.current?.focus();
  }

  return (
    // A glass surface without blur: the header pill and the coin header already blur.
    <section
      aria-labelledby={TITLE_ID}
      className={cn(
        glassSurfaceClassName,
        "flex flex-col gap-4 rounded-xl border-cosmos/30 p-5 shadow-glow-cosmos",
        className,
      )}
    >
      <h2
        id={TITLE_ID}
        className="flex items-center gap-2 font-display text-lg font-semibold text-fg"
      >
        <SparkleIcon className="text-xl text-cosmos" />
        {t("title")}
      </h2>
      {state === undefined ? (
        <>
          <p className="text-pretty text-fg-muted">{t("intro", { name: coin.name })}</p>
          <Button onClick={handleAnalyze} className="self-start">
            <SparkleIcon />
            {t("analyze")}
          </Button>
        </>
      ) : null}
      <AnalysisPanel
        ref={panelRef}
        variant="card"
        coin={coin}
        state={state}
        onRetry={() => analyses.analyze(coin.id)}
      />
    </section>
  );
}
