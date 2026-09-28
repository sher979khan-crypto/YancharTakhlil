# Yanchar Takhlil

Standalone crypto web app: the top 99 cryptocurrencies by market cap, current prices, coin
detail pages and two AI agents. Locales: English, Arabic (RTL) and Uzbek (Latin).

See [CLAUDE.md](./CLAUDE.md) for architecture and working rules.

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 10.33.0 (pinned via `packageManager`)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in values locally; never commit them
pnpm dev                     # http://localhost:3000
```

## Commands

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start the dev server                                 |
| `pnpm build`        | Production build                                     |
| `pnpm start`        | Serve the production build                           |
| `pnpm lint`         | ESLint                                               |
| `pnpm typecheck`    | TypeScript type check                                |
| `pnpm test`         | Run unit tests once (Vitest)                         |
| `pnpm test:watch`   | Run unit tests in watch mode                         |
| `pnpm format`       | Format all files with Prettier                       |
| `pnpm format:check` | Check formatting                                     |
| `pnpm eval:analyst` | AI Analyst model evaluation (manual only, see below) |

### AI Analyst model evaluation

`EVAL_CONFIRM=1 pnpm eval:analyst` runs `scripts/eval-analyst.ts`: one real OpenRouter call per
free candidate model (listed in `src/config/ai.ts`) x coin (bitcoin + the first complete coin ranked
40-60) x locale (en, ar, uz), at most 30 calls, through the app's own validation chain. It needs
`OPENROUTER_API_KEY_ANALYST` and `COINGECKO_API_KEY` in `.env.local` and uses the free tier's daily
quota (50 requests), so it never runs in CI and refuses to start without `EVAL_CONFIRM=1`. The
Markdown report and JSON go to `EVAL_OUT_DIR` (default: `<os tmp>/yanchar-takhlil-eval`), which must
be outside the repository.
