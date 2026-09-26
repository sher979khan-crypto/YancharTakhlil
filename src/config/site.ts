import { PHASE_PRODUCTION_BUILD } from "next/constants";

export const siteConfig = {
  name: "Yanchar Takhlil",
  description: "Top 99 cryptocurrencies by market cap, live prices and AI-assisted analysis.",
  // Browser UI color; must equal --color-bg in globals.css (checked by design-tokens.test.ts).
  themeColor: "#07090d",
} as const;

export const DEFAULT_SITE_URL = "http://localhost:3000";

type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  URL?: string;
};

/** Absolute http(s) URL without a trailing slash (base path kept), or null if unusable. */
export function parseSiteUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/**
 * First valid candidate: NEXT_PUBLIC_SITE_URL (explicit override), then Netlify's read-only URL
 * (the site's main address, custom domain if set), then localhost. Invalid values are skipped.
 */
export function resolveSiteUrl(env: SiteUrlEnv): string {
  return parseSiteUrl(env.NEXT_PUBLIC_SITE_URL) ?? parseSiteUrl(env.URL) ?? DEFAULT_SITE_URL;
}

// Kept on globalThis, not in a module variable: the build bundles this file separately for pages
// and for route handlers (robots, sitemap), and both run in the same process.
const WARNED_KEY = Symbol.for("yanchar-takhlil.site-url-fallback-warned");
type WarnFlagHolder = { [WARNED_KEY]?: boolean };

/**
 * Public base URL for canonical/hreflang links, robots.txt and the sitemap. Server-only in
 * practice: Netlify sets URL during the build (SSG, sitemap, robots) and for serverless functions
 * at runtime, but it is not inlined into client bundles. A missing URL never fails the build,
 * because a wrong canonical is recoverable while a crashed deploy is not; it warns instead.
 * https://docs.netlify.com/build/configure-builds/environment-variables/#read-only-variables
 * https://docs.netlify.com/build/functions/environment-variables/
 */
export function getSiteUrl(): string {
  const siteUrl = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    URL: process.env.URL,
  });
  if (
    siteUrl === DEFAULT_SITE_URL &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
    !(globalThis as WarnFlagHolder)[WARNED_KEY]
  ) {
    (globalThis as WarnFlagHolder)[WARNED_KEY] = true;
    console.warn(
      `[site] Neither NEXT_PUBLIC_SITE_URL nor Netlify's URL is a valid http(s) URL; canonical links, hreflang and the sitemap will use ${DEFAULT_SITE_URL}.`,
    );
  }
  return siteUrl;
}
