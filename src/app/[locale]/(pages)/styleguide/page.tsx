import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";

import { CrystalConstellationPoster } from "@/components/features/hero/crystal-constellation-poster";
import { ColorTokens } from "@/components/features/styleguide/color-tokens";
import {
  SearchInputDemo,
  SegmentedControlDemo,
} from "@/components/features/styleguide/glass-demos";
import { TickerDemo } from "@/components/features/styleguide/ticker-demo";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Card, type CardGlow } from "@/components/ui/card";
import { CoinLogo, type CoinLogoSize } from "@/components/ui/coin-logo";
import { DemoBanner } from "@/components/ui/demo-banner";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronIcon,
  CrystalIcon,
  DashIcon,
  SearchIcon,
  SparkleIcon,
  XIcon,
} from "@/components/ui/icons";
import { PriceChange } from "@/components/ui/price-change";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { TickerNumber } from "@/components/ui/ticker-number";
import { formatCompactCurrency, formatPercent, formatPrice } from "@/lib/i18n/format";

// Dev-only tool; labels are English by design (documented exception in CLAUDE.md §9).

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const variants: ButtonVariant[] = ["primary", "secondary", "ghost"];
const sizes: ButtonSize[] = ["sm", "md", "lg"];
const tones: BadgeTone[] = ["neutral", "up", "down", "brand", "cosmos", "ice"];
const glows: CardGlow[] = ["brand", "up", "down", "cosmos"];
const logoSizes: CoinLogoSize[] = [24, 32, 40, 64];
// A documented /coins/markets image URL (host allowed in src/config/images.ts).
const BTC_LOGO = "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs text-fg-subtle">{children}</p>;
}

export default function StyleguidePage() {
  const locale = useLocale();
  if (process.env.NODE_ENV === "production") notFound();

  const numberSamples = [
    formatPrice(64250.5, locale),
    formatPrice(0.00001234, locale),
    formatPercent(2.5, locale),
    formatPercent(-1.2, locale),
    formatCompactCurrency(1234567890123, locale),
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-2">
        <Badge tone="brand" className="self-start">
          dev only
        </Badge>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Glass &amp; Crystal styleguide
        </h1>
        <p className="text-fg-muted">
          Tokens and UI primitives. Open /ar/styleguide to check RTL mirroring. This dev-only page
          shows more than 3 blur layers at once by design; product pages must not.
        </p>
      </div>

      <Section title="Color tokens and contrast (WCAG 2.2)">
        <ColorTokens />
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Label>font-display · Unbounded 700 / 600 / 500 (Arabic: IBM Plex Sans Arabic)</Label>
            <p className="font-display text-4xl font-bold">Yanchar Takhlil</p>
            <p className="font-display text-2xl font-semibold">Oʻzbekiston gʻalaba</p>
            <p className="font-display text-xl font-medium">Ticker Noir — night trading floor</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label>font-sans · Noto Sans 600 / 500 / 400</Label>
            <p className="text-lg font-semibold">Oʻzbekiston gʻalaba — maʼlumot, taʼlim</p>
            <Label>Uzbek glyph check · font-sans 18px</Label>
            <p className="font-sans text-lg">Oʻzbekiston, gʻalaba, boʻyicha, sunʼiy, maʼlumot</p>
            <p className="font-medium">Top 99 cryptocurrencies by market cap.</p>
            <p className="text-sm text-fg-muted">
              The quick brown fox jumps over the lazy dog. Oʻzbekiston gʻalaba.
            </p>
          </div>
          <div className="flex flex-col gap-1" lang="ar" dir="rtl">
            <Label>font-sans / font-display · IBM Plex Sans Arabic 600 / 500 / 400</Label>
            <p className="font-display text-2xl font-semibold">أكبر 99 عملة مشفرة</p>
            <p className="font-medium">الأسعار المباشرة وتحليل مدعوم بالذكاء الاصطناعي.</p>
            <p className="text-sm text-fg-muted">
              السعر الحالي <bdi className="font-mono tabular-nums">$64,250.50</bdi> اليوم.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Label>font-mono tabular-nums · JetBrains Mono 500 / 400</Label>
            <p className="font-mono text-2xl font-medium tabular-nums">
              <bdi>0123456789</bdi> <bdi>$64,250.50</bdi>
            </p>
            <p className="font-mono tabular-nums">
              <bdi dir="ltr">+2.50%</bdi> <bdi dir="ltr">−1.20%</bdi> <bdi>1.23T</bdi>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Number formatting (active locale)">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono tabular-nums">
          {numberSamples.map((sample) => (
            <li key={sample}>
              <bdi>{sample}</bdi>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Button">
        <div className="flex flex-col gap-4">
          {variants.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <Label>{variant}</Label>
              {sizes.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size}
                </Button>
              ))}
              <Button variant={variant} loading>
                Loading
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant}>
                Next
                <ChevronIcon />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="GlassPanel (over the bright glow area)">
        {/* Recreates the ice glow at its peak behind the panels, wherever this section scrolls. */}
        <div className="grid gap-4 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,var(--page-glow-ice),transparent_70%)] p-4 sm:grid-cols-2 sm:p-8 rtl:bg-[radial-gradient(ellipse_at_top_right,var(--page-glow-ice),transparent_70%)]">
          <GlassPanel className="flex flex-col gap-2 p-5">
            <Label>strength=&quot;default&quot; · glass-fill 55%</Label>
            <p className="text-fg">Navigation, hero, floating panels.</p>
            <p className="text-fg-muted">Muted text on glass.</p>
            <p className="text-sm text-fg-subtle">Subtle text on glass.</p>
          </GlassPanel>
          <GlassPanel strength="strong" as="aside" className="flex flex-col gap-2 p-5">
            <Label>strength=&quot;strong&quot; · glass-fill-strong 75%</Label>
            <p className="text-fg">Text-heavy glass (disclaimer, chat).</p>
            <p className="text-fg-muted">Muted text on strong glass.</p>
            <p className="text-sm text-fg-subtle">Subtle text on strong glass.</p>
          </GlassPanel>
        </div>
        <p className="text-sm text-fg-muted">
          Emulate prefers-reduced-transparency: reduce (DevTools → Rendering) to see the solid
          fallback: surface-1 (default) / surface-2 (strong), same border.
        </p>
      </Section>

      <Section title="DemoBanner">
        <DemoBanner />
      </Section>

      <Section title="SegmentedControl">
        <SegmentedControlDemo />
        <p className="text-sm text-fg-muted">
          Tab into the group, then use arrow keys (reading direction in RTL), Home and End.
        </p>
      </Section>

      <Section title="SearchInput">
        <SearchInputDemo />
      </Section>

      <Section title="StatTile">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Bitcoin"
            value={<TickerNumber value={64250.5} format="price" locale={locale} />}
            change={{ value: 2.5, locale }}
          />
          <StatTile
            label="Market cap"
            value={<TickerNumber value={3.42e12} format="compact" locale={locale} />}
            change={{ value: -1.2, locale }}
          />
          <StatTile
            label="BTC dominance"
            value={<TickerNumber value={56.67} format="percent" locale={locale} />}
          />
        </div>
      </Section>

      <Section title="CoinLogo">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Label>image</Label>
            {logoSizes.map((size) => (
              <CoinLogo key={size} src={BTC_LOGO} name="Bitcoin" symbol="btc" size={size} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Label>monogram</Label>
            {logoSizes.map((size) => (
              <CoinLogo key={size} src={null} name="Solana" symbol="sol" size={size} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <CoinLogo src={null} name="Ethereum" symbol="eth" size={24} decorative />
            <span className="text-fg">Ethereum</span>
            <Label>decorative (name shown next to it)</Label>
          </div>
        </div>
      </Section>

      <Section title="Hero poster (static crystal constellation)">
        <GlassPanel className="p-4">
          <CrystalConstellationPoster className="mx-auto max-w-lg" />
        </GlassPanel>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {tones.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <Label>variant=&quot;solid&quot; (default)</Label>
            <p className="mt-2 text-fg">surface-1, line border, lg radius. Data and tables.</p>
          </Card>
          <Card variant="glass">
            <Label>variant=&quot;glass&quot;</Label>
            <p className="mt-2 text-fg">GlassPanel styling, xl radius.</p>
          </Card>
          <Card variant="glass" glow="cosmos">
            <Label>variant=&quot;glass&quot; glow=&quot;cosmos&quot;</Label>
            <p className="mt-2 text-fg-muted">Glass with a meaningful glow.</p>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {glows.map((glow) => (
            <Card key={glow} glow={glow}>
              <Label>glow=&quot;{glow}&quot;</Label>
              <p className="mt-2 text-fg-muted">Soft outer glow</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Skeleton">
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </Section>

      <Section title="PriceChange">
        <div className="flex flex-wrap items-center gap-6">
          {[2.5, -1.2, 0, 0.004, 12345.678].map((value) => (
            <div key={value} className="flex flex-col gap-1">
              <Label>value={value}</Label>
              <PriceChange value={value} locale={locale} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap items-center gap-6 text-2xl">
          <span className="flex items-center gap-2">
            <ArrowUpIcon className="text-up" />
            <Label>arrow-up (never mirrors)</Label>
          </span>
          <span className="flex items-center gap-2">
            <ArrowDownIcon className="text-down" />
            <Label>arrow-down (never mirrors)</Label>
          </span>
          <span className="flex items-center gap-2">
            <DashIcon className="text-fg-muted" />
            <Label>dash</Label>
          </span>
          <span className="flex items-center gap-2">
            <ChevronIcon direction="start" />
            <Label>chevron start (mirrors)</Label>
          </span>
          <span className="flex items-center gap-2">
            <ChevronIcon direction="end" />
            <Label>chevron end (mirrors)</Label>
          </span>
          <span className="flex items-center gap-2">
            <SearchIcon />
            <Label>search (mirrors)</Label>
          </span>
          <span className="flex items-center gap-2">
            <XIcon />
            <Label>x (clear)</Label>
          </span>
          <span className="flex items-center gap-2">
            <SparkleIcon className="text-ice" />
            <Label>sparkle (AI)</Label>
          </span>
          <span className="flex items-center gap-2">
            <CrystalIcon className="text-ice" />
            <Label>crystal</Label>
          </span>
          <span className="flex items-center gap-2">
            <AlertIcon className="text-brand" />
            <Label>alert (demo data)</Label>
          </span>
        </div>
      </Section>

      <Section title="TickerNumber">
        <Card>
          <TickerDemo locale={locale} />
        </Card>
      </Section>
    </div>
  );
}
