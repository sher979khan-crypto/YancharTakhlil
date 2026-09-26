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
- Planned (added only in their own steps): zod, server-only, lightweight-charts, Playwright.
- Before adding ANY dependency: check its official docs and npm for the current version and compatibility
  with Next 16 / React / Tailwind 4, and record it here.

## 4. Commands
- pnpm dev | build | start | lint | typecheck | test | test:watch | format | format:check
- Definition of Done for every task: format:check, lint, typecheck, test and build all pass, and the page
  was checked in a browser (en, ar, uz, and mobile width once those exist).

## 5. Folder structure
src/
  app/                        Routes only; keep thin. Later: app/api/v1/...
    [locale]/                 Root layout (shell), not-found, error, [...rest] catch-all (unknown URL -> 404)
    [locale]/(pages)/         All pages (route group, so the layout's title template applies to the
                              home page too). No route-level loading.tsx (see §6).
    robots.ts, sitemap.ts, global-error.tsx
  components/ui/              Design-system primitives (Button, Card, Badge, ...)
  components/features/<name>/ Feature components (coins, coin-detail, analyst, assistant, hero,
                              site-header, site-footer, skip-link, brand, locale-switcher)
  lib/domain/                 Types and pure business logic. No I/O.
  lib/providers/              Data-access interfaces and implementations (coingecko/, json/, memory/)
  lib/ai/core/                Shared OpenRouter client, guards (rate limit, budget, input limits)
  lib/ai/agents/assistant/    "Kotib" agent: prompt, config, tools
  lib/ai/agents/analyst/      "Tahlilchi" agent: prompt, config, output schema
  lib/ai/indicators/          Technical indicators (pure functions, unit-tested)
  lib/i18n/                   i18n helpers
  lib/navigation/             Nav items and the active-route matcher
  lib/seo/                    Canonical/hreflang builder and per-page metadata helper
  lib/utils/                  Small pure helpers
  config/                     Non-secret config: site.ts, ai.ts, cache.ts
  data/                       Static JSON: excluded-coins.json, knowledge/{en,ar,uz}.json
  messages/                   UI translations: en.json, ar.json, uz.json
Tests are colocated as *.test.ts(x).

## 6. Architecture rules
- UI never calls external APIs. Flow: external API -> provider implementation -> interface -> Server
  Components / Route Handlers -> UI.
- Interfaces: MarketDataProvider, ContentRepository, ChatHistoryStore.
- Server Components call providers directly. Never fetch your own /api routes from the server.
- Route Handlers live under /api/v1/* and serve client polling, chat, analysis and future clients.
- Validate all external data and all request input with zod.
- No route-level loading.tsx above any page that can call notFound(): it makes the response stream and
  turns 404 into 200. Show loading states with <Suspense> inside the page, after validation/notFound checks.
- Coin pages use on-demand ISR. NEVER pre-render all coins at build time (99 coins x 3 locales would
  exhaust the API quota).
- Only coin IDs from the current top-99 list are accepted; everything else returns 404.
- Cache TTLs (single source: src/config/cache.ts): markets 120s, coin detail 120s, daily history 30m,
  global market 10m, AI analysis 15m per coin+locale.
- API error shape: { "error": { "code": string, "message": string } }. Never expose stack traces or
  upstream error details to the client.

## 7. AI agents
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
  client (hydration mismatch). Dates will follow the same rule when added.
- Uzbek Latin orthography: use oʻ / gʻ with U+02BB and U+02BC for the tutuq belgisi; never a plain ASCII apostrophe.

## 10. Design
- Concept: "Ticker Noir" (dark, precise trading-terminal mood with living numbers) plus a
  "Constellation" star-map hero on the home page.
- Design tokens are defined in Tailwind's @theme in src/app/globals.css (Step 3). Components use tokens only.
  No raw hex values outside globals.css (exceptions: siteConfig.themeColor and src/app/icon.svg, both
  checked against the tokens by src/config/design-tokens.test.ts). Tailwind's default palette is removed.
  - Colors: bg, surface-1, surface-2, surface-3, line, fg, fg-muted, fg-subtle, brand, brand-fg, up, down,
    cosmos. Text tokens (fg, fg-muted, fg-subtle, up, down, brand, cosmos) reach 4.5:1 on bg, surface-1 and
    surface-2; brand-fg on brand too. The contrast test fails CI otherwise. line is decorative only (1.3-1.5:1):
    a form-control edge must use fg-subtle.
  - Shadows: shadow-glow-{brand,up,down,cosmos}. Radius: rounded-sm 4px, rounded-md 8px, rounded-lg 12px.
  - Motion: duration-fast 120ms, duration-base 200ms, duration-slow 400ms, ease-snap
    cubic-bezier(0.2, 0.8, 0.2, 1). Animations: animate-shimmer, animate-flash-{up,down}, animate-roll-{up,down}.
  - Dark only (color-scheme: dark). Focus ring: 2px brand outline + 2px offset, set globally on :focus-visible.
- Fonts (src/lib/fonts.ts, next/font/google, self-hosted): font-display = Unbounded (headings/hero),
  font-sans = Noto Sans (body/UI), font-mono = JetBrains Mono (numbers, always with tabular-nums).
  Arabic ([lang="ar"]): font-display = IBM Plex Sans Arabic; font-sans = Noto Sans first, then IBM Plex
  Sans Arabic (Arabic glyphs fall through to Plex, Latin words match the rest of the site); numbers stay mono.
- font-brand = Unbounded, used only for the brand wordmark; identical in all locales.
- font-mono is only for numbers and tickers, never for words (JetBrains Mono lacks U+02BB).
- UI primitives live in src/components/ui: Button, Card, Badge, Skeleton, PriceChange, TickerNumber, icons.
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
