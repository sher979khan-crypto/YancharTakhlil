"use client";

import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type AnalyzeButtonProps = {
  coinName: string;
  expanded: boolean;
  /** Id of the panel region the button opens. */
  controls: string;
  onClick: () => void;
  className?: string;
};

/**
 * The "✦ AI" toggle of a markets row or card. The visible word ("AI", ar "تحليل") is part of the
 * accessible name "Analyze {coin} with AI" in every locale (WCAG 2.5.3 label in name).
 */
export function AnalyzeButton({
  coinName,
  expanded,
  controls,
  onClick,
  className,
}: AnalyzeButtonProps) {
  const t = useTranslations("Analyst");

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={t("buttonLabel", { coin: coinName })}
      onClick={onClick}
      className={buttonClassName({
        variant: "secondary",
        // 40px: the touch target minimum for this step.
        className: cn(
          "min-w-10 gap-1 px-2.5 text-cosmos hover:border-cosmos/50",
          expanded && "border-cosmos/50 bg-cosmos/12 bg-none shadow-glow-cosmos",
          className,
        ),
      })}
    >
      <SparkleIcon className="text-base" />
      {t("button")}
    </button>
  );
}
