import { useTranslations } from "next-intl";

export const MAIN_CONTENT_ID = "main-content";

/** First focusable element on every page; hidden until focused (WCAG 2.4.1 Bypass Blocks). */
export function SkipLink() {
  const t = useTranslations("SkipLink");

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      // Padding sits in the focus: variant because not-sr-only resets padding to 0.
      className="sr-only rounded-md bg-brand text-sm font-medium text-brand-fg focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:px-4 focus:py-2.5"
    >
      {t("label")}
    </a>
  );
}
