# Yanchar Takhlil — Guide for Claude Code

## 1. Product
- Standalone web app (NOT connected to Telegram). Shows the top 99 cryptocurrencies by market
  cap (stablecoins and wrapped tokens excluded), current prices, coin detail pages, and two AI agents.
- Locales: en (default on first visit), ar (full RTL), uz (Latin script only).
- Current stage: no backend, no database. Static content lives in JSON files in src/data and src/messages.
- Future: backend, user accounts, paid subscriptions. All data access MUST stay behind interfaces
  so JSON can be swapped for an API/DB without touching the UI.
- Hosting: GitHub repo, deploy to Netlify. Every solution must be Netlify-compatible.
- Market data: CoinGecko (Demo key during development; commercial plan required before subscriptions launch).
  Attribution "Data provided by CoinGecko" with a link is mandatory in the UI.

## 2. Roles and workflow
- Owner makes final decisions. Mentor (separate session) plans, writes prompts and audits code.
- You (Coder) implement exactly ONE task per prompt. Do not expand scope. Do not implement future steps.
  Put follow-up ideas in your final report instead.
- Final report for every task: files changed, commands run with results, deviations, open questions.

## 3. Stack
- Next.js 16.3.6 (App Router, src/ dir, Turbopack default), React 19.2.8, TypeScript 5.9.3 (strict)
- Tailwind CSS 4.3.3, ESLint (flat config), Prettier, Vitest
- next-intl 4.14.7 (i18n routing, messages, proxy; peer deps next ^16, react ^19)
- Package manager: pnpm 10.33.0 (pinned via packageManager). Node 22 (.nvmrc).
- UI helpers (Step 3): clsx 2.1.1 and tailwind-merge 3.7.0 (README: supports Tailwind v4.0-v4.3), used only
  through src/lib/utils/cn.ts. Custom @theme keys (glow shadows, ease-snap, animations, duration-fast/base/slow)
  must be registered in cn.ts when added.
- Data layer (Step 5): zod 4.6.5 (v4 API, `import * as z from "zod"`) and server-only 0.0.1. In Vitest,
  server-only is aliased to the package's own empty.js (vitest.config.ts), as the Next.js Jest guide does.
- Charts (Step 10): lightweight-charts 5.2.1 (Apache-2.0, exact pin; v5 API createChart + addSeries(AreaSeries)),
  loaded only by the coin page's PriceChart via dynamic import. License rule: keep layout.attributionLogo on
  and show the NOTICE text + https://www.tradingview.com/ link on the Disclaimer page
  (src/config/third-party-notices.ts; the npm package ships no NOTICE, so the text is from the v5.2.1 tag).
- Planned (added only in their own steps): Playwright.
- Before adding ANY dependency: check its official docs and npm for the current version and compatibility
  with Next 16 / React / Tailwind 4, and record it here.

## 4. Commands
- pnpm dev | build | start | lint | typecheck | test | test:watch | format | format:check
- Definition of Done for every task: format:check, lint, typecheck, test and build all pass, and the page
  was checked in a browser (en, ar, uz, and mobile width once those exist).

## 5. Folder structure
src/
  app/                        Routes only; keep thin.
    api/v1/                   Public read API (GET only): coins, coins/[id], coins/[id]/chart, global
    [locale]/                 Root layout (shell), not-found, error, [...rest] catch-all (unknown URL -> 404)
    [locale]/(pages)/         All pages (route group, so the layout's title template applies to the
                              home page too). No route-level loading.tsx (see §6).
    robots.ts, sitemap.ts, global-error.tsx
  components/ui/              Design-system primitives (Button, Card, Badge, ...)
  components/features/<name>/ Feature components (markets, home, coin-detail, analyst, assistant, hero,
                              site-header, site-footer, skip-link, brand, locale-switcher)
  components/features/markets/ MarketsExplorer (client: search, tabs, sort, polling), CoinsTable (md+),
                              CoinCards (< md), UpdatedAgo (client-only relative time), useCoinsPolling
                              (= usePolling(fetchCoins)), market-status (SourceBadge, StaleNotice,
                              PollErrorNotice; shared with the coin header)
  components/features/coin-detail/ CoinBreadcrumb, CoinHeader (client: polls /api/v1/coins/{id}),
                              PriceChart (client: lightweight-charts, 7/30/90D), AnalystPlaceholder,
                              CoinStats (server, solid cards)
  components/features/home/   HomeLive (client: ONE useCoinsPolling feeds TickerTape + TopMovers; the
                              server-rendered MarketPulse is passed in as children), TickerTape (CSS
                              marquee), MarketPulse (server, 4 StatTiles), TopMovers, MarketDataUnavailable;
                              static content sections (server, no client JS): FeaturesSection, HowItWorks,
                              WhyUs, Faq (native <details>, FAQ_ITEM_IDS = Home.faq.items), FinalCta
  lib/domain/                 zod schemas, inferred types and pure business logic (market, errors,
                              coin-filter, stablecoin-watch, market-list, coin-stats). No I/O.
  lib/api/                    /api/v1 contract (contract.ts: zod schemas, no server-only, shared with the
                              client), params.ts, responses.ts (ok/fail, server-only), cache-headers.ts,
                              fetch-coins.ts (browser clients fetchCoins / fetchCoinDetail / fetchCoinChart;
                              imports contract.ts only)
  lib/hooks/                  use-polling.ts: usePolling(fetcher, initial), the one client polling loop
  lib/providers/              Data-access interfaces, get-market-data-provider.ts, the provider contract
                              suite, and implementations (fixture/, json/, memory/, coingecko/)
  lib/env/                    server-env.ts: zod-validated server env (server-only)
  lib/ai/core/                Shared OpenRouter client, guards (rate limit, budget, input limits)
  lib/ai/agents/assistant/    "Kotib" agent: prompt, config, tools
  lib/ai/agents/analyst/      "Tahlilchi" agent: prompt, config, output schema
  lib/ai/indicators/          Technical indicators (pure functions, unit-tested)
  lib/i18n/                   i18n helpers
  lib/navigation/             Nav items and the active-route matcher
  lib/seo/                    Canonical/hreflang builder and per-page metadata helper
  lib/utils/                  Small pure helpers (incl. loadOrNull: one failing data call degrades one section)
  config/                     Non-secret config: site.ts, ai.ts, cache.ts, chat.ts, third-party-notices.ts
  data/                       Static JSON: excluded-coins.json, fixtures/market-snapshot.json,
                              knowledge/{en,ar,uz}.json
  messages/                   UI translations: en.json, ar.json, uz.json
Tests are colocated as *.test.ts(x).

## 6. Architecture rules
- UI never calls external APIs. Flow: external API -> provider implementation -> interface -> Server
  Components / Route Handlers -> UI.
- Interfaces: MarketDataProvider, ContentRepository, ChatHistoryStore.
- Server Components call providers directly. Never fetch your own /api routes from the server.
- Route Handlers live under /api/v1/* and serve client polling, chat, analysis and future clients.
  Server Components never call /api routes; they call the provider directly.
- API contract (src/lib/api/contract.ts): success { data, meta: { source, fetchedAt, stale } },
  error { error: { code, message } }. Handlers stay thin: parse params (params.ts) ->
  getMarketDataProvider() -> ok(result, cacheTtl.X) / fail(error). The API returns raw numbers, no locale.
- Status mapping (responses.ts): bad input (ApiInputError) 400 INVALID_INPUT; NOT_FOUND 404; RATE_LIMITED
  503 + Retry-After: 30; UPSTREAM/INVALID_RESPONSE 502 UPSTREAM_ERROR; CONFIG 500 CONFIG_ERROR; anything
  else 500 INTERNAL (logged server-side by name + message). Public messages are fixed strings.
- Cache headers only via src/lib/api/cache-headers.ts: success "public, max-age=0, s-maxage=<ttl>,
  stale-while-revalidate=<ttl*5>"; 404 "public, s-maxage=60" (cacheTtl.apiNotFound); other errors no-store.
- Dynamic route handler params are typed inline ({ params: Promise<{ id: string }> }), not with the
  generated RouteContext global, so `pnpm typecheck` passes on a clean clone.
- Validate all external data and all request input with zod.
- Provider selection lives in get-market-data-provider.ts. Every MarketResult carries `source`; when
  source === "fixture" the UI must show the demo-data banner. Never present fixture data as real.
- Every MarketDataProvider must pass runMarketDataProviderContract (market-data-provider.contract.ts).
- Provider selection (MARKET_DATA_PROVIDER): auto + key -> CoinGecko; auto without key -> fixture;
  fixture -> fixture; coingecko without key -> MarketDataError CONFIG (never silently demo data).
- CoinGecko quota: ONE /coins/markets call (per_page=250, page=1, price_change_percentage=1h,24h,7d,30d,
  sparkline=true) feeds both getTopCoins and getCoinDetail. Never call /coins/{id}. Only market_chart
  (daily) and /global cost extra calls. The 7-day chart is the tail of the cached 30-day series (no call
  of its own); only 30 and 90 days call market_chart.
- The 7-day sparkline (Coin.sparkline7d, <= 42 points, oldest first, null when missing/short) is part of
  that single markets call (sparkline_in_7d.price, nulls dropped, downsampled keeping first and last).
  Never fetch a chart endpoint to draw a list sparkline. The API key travels only in the x-cg-{demo,pro}-api-key header.
- CoinGecko calls use Next's data cache (fetch `next: { revalidate: cacheTtl.X, tags }`), plus an
  in-process last-good cache that serves stale: true on upstream failure (best-effort per instance).
- Static JSON is loaded with static imports (not fs) and zod-validated when the module loads.
- No route-level loading.tsx above any page that can call notFound(): it makes the response stream and
  turns 404 into 200. Show loading states with <Suspense> inside the page, after validation/notFound checks.
- The markets page is ISR (export const revalidate = 120, a literal equal to cacheTtl.markets) and the
  client polls /api/v1/coins every cacheTtl.clientPolling seconds (paused while the tab is hidden).
  Relative times ("Updated 30s ago") render only after mount; the server renders a placeholder.
- List links to coin pages use prefetch={false}: 99 visible links must not render 99 coin pages.
- Coin pages use on-demand ISR. NEVER pre-render all coins at build time (99 coins x 3 locales would
  exhaust the API quota). /[locale]/markets/[id]: revalidate = 120 (literal), dynamicParams = true,
  generateStaticParams returns [] (the documented "all paths at runtime" ISR). The id is checked with
  CoinIdParamSchema and getCoinDetail NOT_FOUND -> notFound() (HTTP 404); other errors -> error.tsx.
  getCoinDetail is wrapped in React cache() so metadata and page share it; the initial 30-day chart
  loads in parallel through loadOrNull (a chart failure never breaks the page).
- Client polling goes through usePolling(fetcher, initial) (src/lib/hooks): one interval of
  cacheTtl.clientPolling, paused while hidden, last good data kept on failure. One poll per page.
- The coin chart: 30D comes from the server; 7D/90D are fetched from /api/v1/coins/{id}/chart once per
  range and kept in component state. Colors come from CSS variables at runtime; no scroll/zoom
  handling (the page keeps wheel/touch scrolling) and no animation.
- Only coin IDs from the current top-99 list are accepted; everything else returns 404.
- Cache TTLs (single source: src/config/cache.ts): markets 120s, coin detail 120s, daily history 30m,
  global market 10m, API 404 60s, AI analysis 15m per coin+locale; client polling every 60s.
- API error shape: { "error": { "code": string, "message": string } }. Never expose stack traces or
  upstream error details to the client.

## 7. AI agents
- Display names per locale (code names Kotib / Tahlilchi stay in code and docs only):
  en "AI Analyst" / "AI Assistant"; ar "المحلل الذكي" / "المساعد الذكي"; uz "AI Tahlilchi" / "AI Kotib".
  UI copy never shows a Latin agent name in en or ar.
- Two agents share one core (lib/ai/core): OpenRouter client, timeouts, fallback model, per-agent rate
  limit, daily budget, and input size limits.
- Assistant "Kotib": floating chat button on every page, streaming responses, languages en/ar/uz.
  Topics: crypto, trading education, and this app ONLY; politely refuses anything else.
  It may show the current price through ONE read-only tool, get_coin_quote (top-99 only, max 2 calls per
  message). It NEVER analyzes or gives buy/sell advice; it redirects to the Analyst.
  Knowledge about the app comes from src/data/knowledge. Env key: OPENROUTER_API_KEY_ASSISTANT.
- Analyst "Tahlilchi": analyzes one selected coin and returns strict JSON: signal (BUY | HOLD | SELL),
  confidence, reasons[] (each with metric + value + explanation), risks[], invalidation.
  All indicators are computed in code (lib/ai/indicators), never by the LLM. Every number in the output
  must be verified against the input data. Env key: OPENROUTER_API_KEY_ANALYST.
- Model IDs are configured per agent in src/config/ai.ts (env override allowed). Never hard-code model
  IDs anywhere else.
- The "Not financial advice" disclaimer is rendered by the UI on every AI answer. Never rely on the LLM
  to include it.
- System prompts are versioned files. Change them only with owner approval.
- Never put untrusted free text (e.g. coin descriptions from APIs) into prompts. Render AI output as
  plain text or sanitized markdown. No raw HTML.
- Chat history is in memory only (React state) for now, behind ChatHistoryStore; a backend comes later.

## 8. Security
- Secrets live only in .env.local (local) and Netlify environment variables (production).
  Never commit .env files. .env.example holds names only.
- Modules that read secrets must import "server-only". Never prefix a secret with NEXT_PUBLIC_.
- Never log secrets, request headers, or URLs that contain keys.
- dangerouslySetInnerHTML is forbidden.
- A missing key must fail gracefully (clear server log and a user-friendly error), never crash the whole app.

## 9. i18n and RTL
- Locales: en (default, no browser-language auto-detection), ar (dir="rtl"), uz (Latin script).
- No hard-coded UI strings. Every key must exist in all three message files.
  Exception: the dev-only styleguide (/[locale]/styleguide, 404 in production) uses English labels.
  Text rendered by the UI components themselves still comes from the message files.
  Exception: src/app/global-error.tsx is English-only. It replaces the root layout when that layout
  throws, so it runs outside NextIntlClientProvider and cannot know the locale.
- Use logical CSS only (ms-/me-/ps-/pe-/start-/end-, text-start/text-end). Never left/right.
- Wrap tickers, prices and percentages in <bdi> (or dir="ltr") inside RTL text. Charts stay LTR.
- Format numbers, currency and dates for the active locale, always through src/lib/i18n/format.ts.
- Directional icons (arrows, chevrons) mirror in RTL.
- i18n files: src/lib/i18n/{config,routing,navigation,request,format}.ts; proxy at src/proxy.ts;
  messages in src/messages/{en,ar,uz}.json.
- Adding text: add the key to en.json, ar.json and uz.json in the same change; the parity test enforces it.
- Number formatting is runtime-independent: Intl is only called with en-US; separators and compact suffixes
  come from src/lib/i18n/number-format-spec.ts. Never pass ar/uz locales to Intl in code that runs on the
  client (hydration mismatch).
- Dates never go through Intl (any locale): formatShortDate(isoDate, locale, { withYear }) in format.ts
  uses our own month tables and CLDR-like patterns (src/lib/i18n/date-format-spec.ts): en "Sep 27, 2026",
  ar "27 سبتمبر 2026", uz "27-sen, 2026". The date part of the ISO string is used as written (UTC).
  In the LTR chart, Arabic dates are wrapped in <bdi dir="rtl"> (HTML) or an RTL isolate (canvas text).
- Exception: third-party license notices (Disclaimer page, src/config/third-party-notices.ts) are shown
  verbatim in English (lang="en"), because they are legal text, not UI copy.
- No plural rules on the client: Intl.PluralRules has the same runtime gaps for ar/uz, so ICU plural
  messages are not used. Counts go in label form ("Results: {count}", "Natijalar: {count}"), with the
  number passed as a string.
- Uzbek Latin orthography: use oʻ / gʻ with U+02BB and U+02BC for the tutuq belgisi; never a plain ASCII apostrophe.

## 10. Design
- Concept: "Glass & Crystal" (evolved from "Ticker Noir"): dark trading-terminal mood with living
  numbers, glassmorphism for floating UI, and a crystal-constellation hero (static SVG poster now,
  live 3D in Step 21 with the poster as fallback).
- Design tokens are defined in Tailwind's @theme in src/app/globals.css (Step 3). Components use tokens only.
  No raw hex values outside globals.css (exceptions: siteConfig.themeColor and src/app/icon.svg, both
  checked against the tokens by src/config/design-tokens.test.ts). Tailwind's default palette is removed.
  - Colors: bg, surface-1, surface-2, surface-3, line, fg, fg-muted, fg-subtle, brand, brand-fg, up, down,
    cosmos, ice. Text tokens (fg, fg-muted, fg-subtle, up, down, brand, cosmos, ice) reach 4.5:1 on bg,
    surface-1 and surface-2 AND on the blended backgrounds (see Glass); brand-fg on brand too. The contrast
    test fails CI otherwise. line is decorative only (1.3-1.5:1): a form-control edge must use fg-subtle.
  - Glass tokens (color-mix in globals.css, parsed by the test): glass-fill (surface-1 55%), glass-fill-strong
    (surface-1 75%), glass-border (white 12%), glass-border-strong (white 20%), glass-highlight (white 6%,
    top stop of the inner sheen). Blur: backdrop-blur-glass-sm 8px (< 640px), backdrop-blur-glass 16px.
  - Page background: faint grid on body, plus a fixed body::before layer with an ice glow (6%) at top-start,
    an amber glow (4%) at bottom-end (swapped in RTL via --page-glow-start/end) and a vignette. CSS only.
  - Blended contrast: text on glass is checked against fill + sheen peak over the brightest backdrop (glow
    peak + grid line blurred at 8px); text on the page against the glow peak + a sharp grid line; tinted
    Badges (12%) and DemoBanner (10% amber) over those too (src/config/design-tokens.ts).
  - Shadows: shadow-glow-{brand,up,down,cosmos,ice}, shadow-glass (floating panels), shadow-glass-lifted
    (scrolled header); inset-shadow-highlight(-soft) (lit top edge); text-shadow-glow-ice (display text,
    text stays solid); drop-shadow-glow-ice. Radius: rounded-sm 4px, md 8px, lg 12px, xl 20px, 2xl 28px.
  - Motion: duration-fast 120ms, duration-base 200ms, duration-slow 400ms, ease-snap
    cubic-bezier(0.2, 0.8, 0.2, 1). Animations: animate-shimmer, animate-flash-{up,down}, animate-roll-{up,down},
    animate-float (hero poster, motion-safe only), animate-marquee (ticker tape, 40s, motion-safe only;
    direction from --marquee-shift: -50% LTR, +50% RTL).
- Glass vs solid: data tables and lists stay on SOLID surfaces (Card variant="solid"). Glass only for
  navigation, hero, panels, chat and overlays.
  - Blurred glass (backdrop-filter): GlassPanel, Card variant="glass", the header pill. Max 3 visible in any
    viewport; the mobile menu expands inside the header pill so it adds no layer. The dev-only styleguide
    is exempt.
  - Glass surfaces (no blur, glassSurfaceClassName in src/components/ui/glass.ts): secondary Button,
    SegmentedControl, SearchInput, StatTile, neutral Badge, the locale select.
  - Fallback: the custom variant glass-fallback (globals.css; Tailwind 4.3 has none built in) matches
    @supports not (backdrop-filter) OR prefers-reduced-transparency: reduce. Glass then becomes solid
    surface-1 (default) / surface-2 (strong) with the same border, no sheen, no blur.
  - Dark only (color-scheme: dark). Focus ring: 2px brand outline + 2px offset, set globally on :focus-visible.
- Fonts (src/lib/fonts.ts, next/font/google, self-hosted): font-display = Unbounded (headings/hero),
  font-sans = Noto Sans (body/UI), font-mono = JetBrains Mono (numbers, always with tabular-nums).
  Arabic ([lang="ar"]): font-display = IBM Plex Sans Arabic; font-sans = Noto Sans first, then IBM Plex
  Sans Arabic (Arabic glyphs fall through to Plex, Latin words match the rest of the site); numbers stay mono.
- font-brand = Unbounded, used only for the brand wordmark; identical in all locales.
- font-mono is only for numbers and tickers, never for words (JetBrains Mono lacks U+02BB). The mono stack
  is JetBrains Mono, then IBM Plex Sans Arabic (arabic subset only), so Arabic compact suffixes (مليار) fall
  through to Plex while digits and "$" stay in JetBrains Mono.
- UI primitives live in src/components/ui: Button, Card (solid | glass), Badge (+ ice), Skeleton, PriceChange,
  TickerNumber, GlassPanel, SegmentedControl (client, radiogroup + roving tabindex, arrows follow reading
  direction), SearchInput (server-safe; clear button only with onClear from a client parent), StatTile,
  CoinLogo (next/image; monogram fallback with a 1px ring at 24/32 and 2px at 40/64), DemoBanner
  (required with fixture data), Sparkline (server-safe SVG, aria-hidden, LTR, colored by the 7d change), icons.
- Remote images: next.config images.remotePatterns comes only from src/config/images.ts
  (https://coin-images.coingecko.com/coins/images/**). Never add wildcard hosts.
- Use TickerNumber (live, animated) or PriceChange (percentage move) for all live numbers.
- Vertical arrows (price up/down) never mirror; chevrons do (ChevronIcon direction="start" | "end").
- Price direction is never shown by color alone: always use sign + arrow + color.
- Respect prefers-reduced-motion everywhere.
- Mobile-first. Check at 360, 768 and 1440 px. Accessibility target: WCAG 2.2 AA (keyboard navigation,
  visible focus, contrast).

## 11. Code rules
- TypeScript strict with noUncheckedIndexedAccess. No `any`, no @ts-ignore, and no non-null assertion
  without a justifying comment.
- Server Components by default. Use "use client" only where required, as low in the tree as possible.
- Named exports, except where Next.js requires default exports.
- File names in kebab-case; React components in PascalCase.
- Keep logic in small pure functions under lib/ and unit-test it (indicators, formatters, adapters with
  mocked fetch).
- Comments explain "why", not "what".

## 12. Git
- One branch per task: feat/step-XX-short-name (or fix/...). Conventional Commits. PR into main; CI must pass.
- Never commit secrets, .env files, or build output.

## 13. Working rules
- Do not guess APIs or package names; check official docs and existing code first; ask if unclear.
- If a requirement conflicts with official docs or this file, stop and report instead of improvising.
- Next.js 16 has breaking changes versus older versions. Before writing Next.js code, read the relevant
  guide in node_modules/next/dist/docs/ (e.g. proxy.md replaces middleware). Heed deprecation notices.

## 14. Decisions log (append-only)
- 2026-09-25: Next.js 16 + TS + Tailwind 4; pnpm 10.33.0; Node 22; brand "Yanchar Takhlil".
- 2026-09-25: CoinGecko Demo for development; commercial plan before subscriptions launch.
- 2026-09-25: Two AI agents (Kotib, Tahlilchi) with separate OpenRouter keys and a shared core.
- 2026-09-25: Chat history is in memory only in the MVP.
- 2026-09-25: i18n via next-intl, localePrefix always, no Accept-Language detection,
  Arabic uses Latin digits. Locale is URL-only: next-intl ties cookie reading to the same
  localeDetection flag as Accept-Language, so the locale cookie is disabled and "/" always goes to /en.
- 2026-09-26: Design system "Ticker Noir": dark-only MVP. Palette: bg #07090D, surfaces #0C1017 / #121823 /
  #1A2230, line #243044, fg #E8EDF5, fg-muted #9AA6B8, fg-subtle #778190, brand amber #FFB547 (brand-fg
  #07090D), up #3DDC97, down coral #FF6B5B, cosmos #7C8CFF. Fonts: Unbounded (display), IBM Plex Sans (body),
  IBM Plex Sans Arabic (ar), JetBrains Mono (numbers). Currency is always shown as "$" (narrowSymbol plus
  normalizing the currency part, because CLDR's Arabic narrow symbol is still "US$").
- 2026-09-26: Number formatting is deterministic: Intl.NumberFormat is only called with en-US and its parts
  are mapped through our own per-locale table (src/lib/i18n/number-format-spec.ts), because Intl locale data
  differs between runtimes (Chromium has no Uzbek number data) and broke hydration. Currency is always a "$"
  prefix with the minus before it ("-$12.50"). Separators: en "," and "."; ar Latin digits with "," and ".";
  uz national standard U+00A0 group and "," decimal. Compact suffixes: en K/M/B/T; ar ألف/مليون/مليار/تريليون;
  uz ming/mln/mlrd/trln (ar/uz with a space). NaN/Infinity render as "—". Formatted numbers carry no bidi
  marks; direction comes from markup (<bdi dir="ltr">).
- 2026-09-26: Body font is Noto Sans instead of IBM Plex Sans, whose U+02BB/U+02BC glyphs are wider than
  "o" and leave visible gaps in Uzbek. IBM Plex Sans Arabic, Unbounded and JetBrains Mono stay; JetBrains
  Mono lacks U+02BB, so font-mono is used only for numbers.
- 2026-09-26: Layout shell (Step 4). The nav has exactly two items, Home and Markets; no social/contact
  links yet. The Kotib chat button mounts via AssistantSlot (after the footer) in Step 20.
- 2026-09-26: Unknown URLs use next-intl's error-files pattern ([locale]/[...rest] calls notFound() ->
  [locale]/not-found.tsx), not the experimental global-not-found. Pages live in the [locale]/(pages)
  route group (title template on the home page).
- 2026-09-26: SEO: metadataBase from getSiteUrl() (NEXT_PUBLIC_SITE_URL -> Netlify's read-only URL ->
  localhost, each validated; a production build that falls back to localhost logs one warning).
  Every page's generateMetadata uses buildPageMetadata (src/lib/seo): translated title in the
  "%s | Yanchar Takhlil" template, description, absolute canonical, hreflang en/ar/uz + x-default -> /en,
  and Open Graph (locale en_US/ar_AR/uz_UZ). No canonical at layout level. robots.ts disallows /api/ and
  /*/styleguide; sitemap.ts lists the static pages x 3 locales with hreflang alternates.
- 2026-09-26: Arabic body font chain is Noto Sans first, then IBM Plex Sans Arabic (Noto has no Arabic
  glyphs, so Arabic still renders in Plex). Arabic font-display is unchanged (Plex Arabic first).
- 2026-09-26: Error boundaries call retry() (re-fetches the segment), per the Next 16.3 docs, not reset().
- 2026-09-26: Step 4.1. Route-level loading.tsx removed: it streamed every response, so notFound() in a
  page (e.g. /en/styleguide in production) returned 200. Loading UI goes in <Suspense> inside pages.
- 2026-09-26: font-brand token (Unbounded, never remapped by [lang="ar"]) for the wordmark, which carries
  lang="en".
- 2026-09-26: Step 5. Fixture (demo) mode: without a CoinGecko key the app serves the sample snapshot in
  src/data/fixtures (MARKET_DATA_PROVIDER auto|fixture|coingecko, default auto). Results carry
  source "fixture" and the UI must label them as demo data. Daily series are generated by a seeded PRNG
  (deterministic, shorter ranges are the tail of longer ones).
- 2026-09-26: Exclusion list (excluded-coins.json) matches by symbol for now, grouped by reason; the
  "ids" array is filled with CoinGecko ids in Step 6 for precise matching.
- 2026-09-26: Providers are verified by a shared Vitest contract suite; Step 6 reuses it for CoinGecko
  with mocked fetch. Invalid env values fall back to defaults with one warning naming the variable only.
- 2026-09-26: Step 6. CoinGecko adapter (server-only). One /coins/markets page feeds the top list and
  every coin detail (no /coins/{id}); charts use market_chart?interval=daily, bucketed by UTC date
  (last point per day, last N days). Selection: "coingecko" without a key throws CONFIG. COINGECKO_API_PLAN
  is case-insensitive. HTTP: 8 s timeout (not retried), one retry for 429 (Retry-After, max 3 s) or
  5xx/network (500 ms). The "ids" exclusion list holds CoinGecko ids verified against /coins/markets.
  /coins/markets omits wrapped/staked (rehypothecated) tokens by default and they have a null rank.
- 2026-09-27: Step 7. getDailyPrices returns UP TO `range` points (ascending, unique dates); fewer than
  2 is INVALID_RESPONSE. The fixture still returns full series.
- 2026-09-27: Exclusions extended (symbols): stablecoins eurc, ausd, crvusd, reusd, apxusd, usdai, eurcv,
  apyusd, sofid (SoFiUSD is a bank-issued USD stablecoin, so it is a stablecoin, not a tokenized asset);
  tokenizedAssets kau, ousg, ustbl, safo; wrapped wsteth, weeth.
- 2026-09-27: findPossibleStablecoins (|price - 1| <= 0.02 and |7d change| <= 0.5%) only logs
  "[coingecko] possible stablecoin not excluded: SYMBOL (id)" once per id per process. Exclusion stays manual.
- 2026-09-27: Public read API /api/v1 (GET only; other methods get Next's automatic 405). One success and
  one error shape (src/lib/api/contract.ts), CDN cache headers from cache-headers.ts. Only ApiInputError
  (params.ts) maps to 400; a stray ZodError is a server bug and maps to 500 INTERNAL.
- 2026-09-27: Step 3.2 "Glass & Crystal" design refresh. New ice token #7FE3FF (text token too). Glass fills
  are surface-1 at 55% / 75%, borders white 12% / 20%, blur 8px under 640px and 16px above. The spec's 8% sheen
  was lowered to 6%, and fg-subtle lightened from #778190 to #7E8898 (same hue, toward fg-muted), because
  fg-subtle failed 4.5:1 on glass over the ice glow (3.88:1 at 8%). Brand, up and down are unchanged.
- 2026-09-27: Blur-layer budget: at most 3 backdrop-filter layers visible at once. Small repeated controls
  use glass surfaces without blur. The mobile menu is part of the header pill (not a separate blurred
  panel). Fallback variant glass-fallback covers no-backdrop-filter support and reduced transparency.
- 2026-09-27: Header scroll state uses an IntersectionObserver sentinel (FloatingHeader), no scroll
  listeners. Coin logos are optimized by next/image from coin-images.coingecko.com only (host taken from
  CoinGecko's documented /coins/markets sample); `search` is left open because every URL carries a
  timestamp query.
- 2026-09-27: Step 9a. Markets page: ISR (revalidate 120) + client polling of /api/v1/coins every 60 s.
  Coin.sparkline7d (<= 42 points) comes from the same /coins/markets call (sparkline=true). The fixture
  builds it from the seeded daily series, tilted in log space so it starts at price / (1 + change7d)
  and agrees with the 7d percentage shown next to it (the daily series itself ignores change7d).
- 2026-09-27: Markets list behavior: tabs follow the Telegram bot (gainers = 24h > 0 biggest first,
  losers = 24h < 0 biggest drop first, null 24h in neither); each tab has a default sort until the user
  picks a column (switching tabs resets it); nulls always sort last. The desktop table hides 1h and the
  7d chart below lg and volume below xl, so md (incl. ar/uz) never scrolls sideways; below md the list
  is link cards with a sort select. Only the coin name is a link in the table (not the row).
- 2026-09-27: Status that follows polling (Demo/Live badge, DemoBanner, "updated ago", stale notice,
  poll error with Retry) lives in MarketsExplorer, not in the page, so it reflects the latest data.
- 2026-09-27: Step 9b. Home page is ISR (revalidate 120) and loads getTopCoins and getGlobalMarket in
  parallel, each through loadOrNull: a failing call (including provider selection, e.g. CONFIG) turns only
  its sections into a "Market data is temporarily unavailable" card; the hero always renders. Order: hero ->
  DemoBanner (either source is fixture) -> ticker tape -> market pulse -> top movers.
- 2026-09-27: One poll per page: HomeLive runs a single useCoinsPolling for the ticker (top 20 by rank,
  buildTickerItems) and the movers (5 gainers / 5 losers, buildTopMovers = filterByTab rules). The market
  pulse is static until the next ISR (no /api/v1/global polling). Relative time reuses UpdatedAgo.
- 2026-09-27: Ticker tape: CSS-only marquee (list rendered twice, the copy aria-hidden), pauses on hover and
  focus-within (the strip is focusable), moves toward the start side in both directions. Items are not
  links. Under reduced motion it is a static, scroll-snapping strip with one copy. It is a glass surface
  (no blur) and `relative`, so the sr-only spans inside it cannot widen the page.
- 2026-09-27: Top movers cards are glass surfaces (glassSurfaceClassName + shadow-glass), not blurred
  Cards: with the header pill and the hero's GlassPanel, two blurred cards made 4 visible blur layers at
  1440px. Measured max after the change: 2. Rows use a stretched link (the coin name) for a 40px+ target.
- 2026-09-27: formatPercentUnsigned (1 fraction digit, never signed) for shares such as BTC/ETH dominance.
- 2026-09-27: Step 10. Coin page /[locale]/markets/[id]: on-demand ISR (revalidate 120, generateStaticParams
  []), 404 for malformed / non-top-99 ids (no upstream call for them). Header price polls
  /api/v1/coins/{id}; the stats grid is server-rendered from the ISR snapshot (at most 120 s old).
  AI Analyst is a placeholder card (glass surface, no blur: max 2 blur layers on the page).
- 2026-09-27: lightweight-charts 5.2.1 for the price chart (dynamic import, ~53 KB gzip chunk on the coin
  page only). TradingView attribution logo kept; NOTICE + link on the Disclaimer page.
- 2026-09-27: Fixture daily series are tilted in log space so the 7-day chart starts at
  price / (1 + change7d) and the 30-day chart at price / (1 + change30d) (piecewise linear by day, flat
  before day 29). Both anchors and the tail property (7 ⊂ 30 ⊂ 90) hold exactly.
- 2026-09-27: Exclusions: CoinGecko id "united-stables" added to "ids" (not the symbol "u").
- 2026-09-27: Step 9c. Home content sections after top movers: features, how it works, why us, FAQ,
  final CTA (all Server Components). FAQ Q/A live in Home.faq.items.{id}.{q,a} for reuse by the Step 15
  knowledge base; "for now" free, never "always free". Repeated cards are glass surfaces (no blur); the CTA
  band is the only new blurred layer (header + CTA + footer = 3 at the page bottom). Scroll-driven reveal
  animations were not added (optional).
- 2026-09-27: Browser fetchers in src/lib/api use cache: "no-store", so the CDN s-maxage headers can never
  make the browser HTTP cache answer a poll. Server Cache-Control is unchanged.
- 2026-09-27: CoinGecko getDailyPrices(7) slices the cached 30-day series (one market_chart call per coin
  per 30 min for 7D + 30D). The provider contract now requires 7 days = tail of 30 days.
- 2026-09-27: Agent display names per locale (see §7); the coin page AI placeholder uses them.
