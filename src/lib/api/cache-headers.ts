import { cacheTtl } from "@/config/cache";

/**
 * The only place that builds Cache-Control for /api/v1. s-maxage is for the CDN; browsers get
 * max-age=0 so every poll goes back to the CDN and sees what it holds. Kept separate because
 * Step 8 tunes these for Netlify's CDN.
 */
export function successCacheControl(
  ttlSeconds: number,
  staleWhileRevalidateSeconds: number = ttlSeconds * 5,
): string {
  for (const [name, value] of [
    ["ttlSeconds", ttlSeconds],
    ["staleWhileRevalidateSeconds", staleWhileRevalidateSeconds],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer, got ${value}`);
    }
  }
  return `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;
}

/** 404s are cached briefly to shield the provider from junk ids; other errors are never cached. */
export function errorCacheControl(status: number): string {
  return status === 404 ? `public, s-maxage=${cacheTtl.apiNotFound}` : "no-store";
}
