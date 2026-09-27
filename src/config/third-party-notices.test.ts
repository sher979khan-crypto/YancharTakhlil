import { describe, expect, it } from "vitest";

import { lightweightChartsNotice } from "./third-party-notices";

describe("lightweightChartsNotice", () => {
  it("is the NOTICE of lightweight-charts v5.2.1, byte for byte", () => {
    expect(lightweightChartsNotice.text).toBe(
      "TradingView Lightweight Charts™\nCopyright (с) 2025 TradingView, Inc. https://www.tradingview.com/",
    );
    expect(lightweightChartsNotice.url).toBe("https://www.tradingview.com/");
  });
});
