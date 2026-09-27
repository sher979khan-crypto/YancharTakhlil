import type { NextConfig } from "next";

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>;

/**
 * Hosts next/image may optimize. Only CoinGecko's coin image CDN: /coins/markets returns
 * `image` URLs like https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400
 * (documented sample: https://docs.coingecko.com/reference/coins-markets).
 * `search` is left out on purpose: every URL carries a cache-busting timestamp query, and an
 * omitted field matches any value. Protocol, host, port and path prefix stay pinned.
 */
export const COINGECKO_IMAGE_HOST = "coin-images.coingecko.com";

export const imageRemotePatterns = [
  {
    protocol: "https",
    hostname: COINGECKO_IMAGE_HOST,
    port: "",
    pathname: "/coins/images/**",
  },
] as const satisfies RemotePatterns;
