import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";

import { FAQ_ITEM_IDS } from "./faq";

describe("FAQ_ITEM_IDS", () => {
  // The parity test keeps the three locales in sync; this keeps the rendered list in sync with them.
  it("renders every Home.faq.items entry, in message order", () => {
    expect([...FAQ_ITEM_IDS]).toEqual(Object.keys(en.Home.faq.items));
  });
});
