import { describe, expect, it } from "vitest";

import marketSnapshot from "@/data/fixtures/market-snapshot.json";
import coingeckoMarkets from "@/lib/providers/coingecko/__fixtures__/markets.json";

import nextConfig from "../../next.config";
import { COINGECKO_IMAGE_HOST, imageRemotePatterns } from "./images";

// Same matching rules as next/image for the fields we set: exact protocol, host and port, and a
// "/**" path prefix. Enough to prove which URLs the config lets through.
function isAllowed(src: string): boolean {
  const url = new URL(src);
  return imageRemotePatterns.some(
    (p) =>
      url.protocol === `${p.protocol}:` &&
      url.hostname === p.hostname &&
      url.port === p.port &&
      url.pathname.startsWith(p.pathname.replace(/\*\*$/, "")),
  );
}

describe("image remote patterns", () => {
  it("allows exactly one pattern: CoinGecko's coin image CDN over https", () => {
    expect(imageRemotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        port: "",
        pathname: "/coins/images/**",
      },
    ]);
    expect(COINGECKO_IMAGE_HOST).toBe("coin-images.coingecko.com");
  });

  it("uses no hostname wildcards", () => {
    for (const pattern of imageRemotePatterns) expect(pattern.hostname).not.toContain("*");
  });

  it("is what next.config.ts actually uses", () => {
    expect(nextConfig.images?.remotePatterns).toEqual(imageRemotePatterns);
  });

  it("accepts every logo URL in the CoinGecko and fixture samples", () => {
    const urls = [
      ...coingeckoMarkets.map((coin) => coin.image),
      ...marketSnapshot.coins.map((coin) => coin.imageUrl),
    ].filter((url): url is string => typeof url === "string");
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(isAllowed(url), url).toBe(true);
  });

  it("rejects other hosts, http and other paths", () => {
    expect(isAllowed("https://assets.coingecko.com/coins/images/1/large/bitcoin.png")).toBe(false);
    expect(isAllowed("https://evil.example/coins/images/1.png")).toBe(false);
    expect(isAllowed("http://coin-images.coingecko.com/coins/images/1/large/bitcoin.png")).toBe(
      false,
    );
    expect(isAllowed("https://coin-images.coingecko.com/other/1.png")).toBe(false);
    expect(isAllowed("https://coin-images.coingecko.com:8443/coins/images/1.png")).toBe(false);
  });
});
