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

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Start the dev server           |
| `pnpm build`        | Production build               |
| `pnpm start`        | Serve the production build     |
| `pnpm lint`         | ESLint                         |
| `pnpm typecheck`    | TypeScript type check          |
| `pnpm test`         | Run unit tests once (Vitest)   |
| `pnpm test:watch`   | Run unit tests in watch mode   |
| `pnpm format`       | Format all files with Prettier |
| `pnpm format:check` | Check formatting               |
