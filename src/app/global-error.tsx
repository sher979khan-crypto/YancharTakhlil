"use client";

import { Button } from "@/components/ui/button";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Replaces the root layout ([locale]/layout.tsx) when that layout itself throws, so it runs
// outside NextIntlClientProvider and cannot know the locale. English only by design
// (documented exception in CLAUDE.md §9).
export default function GlobalError({ retry }: GlobalErrorProps) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="flex flex-col items-center justify-center gap-4 px-4 text-center font-sans text-fg antialiased">
        <title>Something went wrong | Yanchar Takhlil</title>
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-prose text-fg-muted">
          We could not load Yanchar Takhlil. Please try again.
        </p>
        <Button onClick={() => retry()}>Try again</Button>
      </body>
    </html>
  );
}
