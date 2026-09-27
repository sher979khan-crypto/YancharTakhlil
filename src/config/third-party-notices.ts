// Legal attribution notices, shown verbatim in English on the Disclaimer page (a documented
// exception to "no hard-coded UI strings", CLAUDE.md §9): they are license text, not UI copy.

export type ThirdPartyNotice = Readonly<{
  /** The notice exactly as the project publishes it; line breaks are kept. */
  text: string;
  url: string;
}>;

/**
 * lightweight-charts 5.2.1 (Apache-2.0). Its README asks for the attribution notice from the
 * NOTICE file plus a link to https://www.tradingview.com/. The npm package does not ship NOTICE,
 * so the text comes from the repository at tag v5.2.1. It is copied byte for byte: the "с" in
 * "(с)" is the Cyrillic letter U+0441 in the original.
 */
export const lightweightChartsNotice: ThirdPartyNotice = {
  text: "TradingView Lightweight Charts™\nCopyright (с) 2025 TradingView, Inc. https://www.tradingview.com/",
  url: "https://www.tradingview.com/",
};

export const thirdPartyNotices: readonly ThirdPartyNotice[] = [lightweightChartsNotice];
