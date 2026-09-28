import { describe, expect, it } from "vitest";

import { BASIC_TEMPLATE_KEYS } from "@/lib/api/contract";
import { LEVEL_KEYS, METRIC_KEYS } from "@/lib/ai/agents/analyst/metrics";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import uz from "@/messages/uz.json";

import { TREND_VALUES } from "./analysis-view";

const catalogs = { en, ar, uz } as const;

/** The message at a dot path (next-intl nests on dots, so "indicators.trend" is two levels). */
function lookup(messages: unknown, path: string): unknown {
  let node = messages;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

describe.each(Object.entries(catalogs))("Analyst labels in %s", (_locale, messages) => {
  it.each([...METRIC_KEYS, ...LEVEL_KEYS])("has a label for %s", (key) => {
    const label = lookup(messages, `Analyst.metrics.${key}`);
    expect(typeof label).toBe("string");
    expect(String(label).trim()).not.toBe("");
  });

  it("has a template for every basic template key", () => {
    for (const key of BASIC_TEMPLATE_KEYS) {
      expect(typeof lookup(messages, `Analyst.basic.templates.${key}`), key).toBe("string");
    }
  });

  it("has a word for every trend value", () => {
    for (const value of TREND_VALUES) {
      expect(typeof lookup(messages, `Analyst.trend.${value}`), value).toBe("string");
    }
  });

  it("has no metric label that no key uses", () => {
    const groups = lookup(messages, "Analyst.metrics") as Record<string, Record<string, string>>;
    const labelled = Object.entries(groups).flatMap(([group, labels]) =>
      Object.keys(labels).map((name) => `${group}.${name}`),
    );
    expect(labelled.sort()).toEqual([...METRIC_KEYS, ...LEVEL_KEYS].sort());
  });
});
