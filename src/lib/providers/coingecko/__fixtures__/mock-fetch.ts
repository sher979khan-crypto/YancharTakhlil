// Test-only: a fetch stand-in that serves the upstream samples in this folder. Never hits the network.
import { vi } from "vitest";

import type { FetchImpl } from "../http";

import global from "./global.json";
import chart30d from "./market-chart-30d.json";
import chart7d from "./market-chart-7d.json";
import chart90d from "./market-chart-90d.json";
import markets from "./markets.json";

export const FIXTURE_DATE_HEADER = "Sat, 26 Sep 2026 12:00:00 GMT";
/** A clock just after FIXTURE_DATE_HEADER, so the Date header counts as the response time. */
export const FIXTURE_NOW = Date.parse("2026-09-26T12:00:05Z");

const charts: Record<string, unknown> = { "7": chart7d, "30": chart30d, "90": chart90d };

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "content-type": "application/json", date: FIXTURE_DATE_HEADER, ...init.headers },
  });
}

/** Routes by path like the real API: markets, any coin's daily chart for 7/30/90 days, global. */
export function routeFixture(input: string): Response {
  const url = new URL(input);
  const path = url.pathname.replace(/^\/api\/v3/, "");
  if (path === "/coins/markets") return jsonResponse(markets);
  if (path === "/global") return jsonResponse(global);
  const chart = /^\/coins\/[^/]+\/market_chart$/.test(path)
    ? charts[url.searchParams.get("days") ?? ""]
    : undefined;
  if (chart) return jsonResponse(chart);
  return jsonResponse({ error: "coin not found" }, { status: 404 });
}

export function createFixtureFetch() {
  return vi.fn<FetchImpl>(async (input) => routeFixture(input));
}

export const noSleep = async (): Promise<void> => {};
