"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TickerNumber } from "@/components/ui/ticker-number";
import type { Locale } from "@/lib/i18n/config";
import { formatCompactCurrency } from "@/lib/i18n/format";

// Deterministic walk so the demo shows both directions without Math.random.
const STEPS = [1.0042, 0.9971, 1.0008, 0.9936, 1.0113, 0.9989];
const OPEN = 64250.5;
const SUPPLY = 19_700_000;

const marketCap = (price: number, locale: Locale) => formatCompactCurrency(price * SUPPLY, locale);

export function TickerDemo({ locale }: { locale: Locale }) {
  const [price, setPrice] = useState(OPEN);
  const [step, setStep] = useState(0);

  function next() {
    setPrice((p) => Math.round(p * (STEPS[step % STEPS.length] ?? 1) * 100) / 100);
    setStep((s) => s + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <TickerNumber value={price} format="price" locale={locale} className="text-3xl" live />
      <TickerNumber
        value={((price - OPEN) / OPEN) * 100}
        format="percent"
        locale={locale}
        className="text-xl"
      />
      <TickerNumber value={price} format={marketCap} locale={locale} className="text-xl" />
      <Button variant="secondary" onClick={next}>
        Change value
      </Button>
    </div>
  );
}
