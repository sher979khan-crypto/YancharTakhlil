import { describe, expect, it } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import uz from "@/messages/uz.json";

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result.set(path, value);
    } else {
      for (const [k, v] of flatten(value, path)) result.set(k, v);
    }
  }
  return result;
}

const reference = flatten(en);
const catalogs: Record<string, Map<string, string>> = {
  en: reference,
  ar: flatten(ar),
  uz: flatten(uz),
};

describe("message catalogs", () => {
  it.each(["ar", "uz"])("%s has exactly the same keys as en", (locale) => {
    const keys = [...(catalogs[locale]?.keys() ?? [])].sort();
    expect(keys).toEqual([...reference.keys()].sort());
  });

  it.each(Object.keys(catalogs))("%s has no empty values", (locale) => {
    for (const [key, value] of catalogs[locale] ?? []) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("uz uses U+02BB / U+02BC instead of apostrophe look-alikes inside words", () => {
    // ASCII ' plus the usual wrong substitutes: backtick and typographic quotes.
    const wrongApostrophe = /\p{L}['`‘’]/u;
    for (const [key, value] of catalogs.uz ?? []) {
      expect(value, key).not.toMatch(wrongApostrophe);
    }
  });

  it("uz actually uses the official oʻ/gʻ letter", () => {
    expect([...(catalogs.uz?.values() ?? [])].join(" ")).toContain("ʻ");
  });
});
