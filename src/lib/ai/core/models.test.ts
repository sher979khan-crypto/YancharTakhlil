import { describe, expect, it } from "vitest";

import { aiConfig, type AiModelConfig } from "@/config/ai";

import { resolveModelChain } from "./models";

const CONFIGURED: AiModelConfig[] = [
  { id: "a/one:free", jsonMode: "schema" },
  { id: "b/two:free", jsonMode: "object" },
];

describe("resolveModelChain", () => {
  it("uses the configured chain without an override", () => {
    expect(resolveModelChain(CONFIGURED, undefined)).toEqual(CONFIGURED);
    expect(resolveModelChain(CONFIGURED, [])).toEqual(CONFIGURED);
  });

  it("follows the override order, keeping known json modes and defaulting others to none", () => {
    expect(resolveModelChain(CONFIGURED, ["c/three", "b/two:free", "c/three"])).toEqual([
      { id: "c/three", jsonMode: "none" },
      { id: "b/two:free", jsonMode: "object" },
    ]);
  });

  it("has a free-only analyst chain in the config", () => {
    const ids = aiConfig.analyst.models.map((model) => model.id);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    for (const id of ids) expect(id).toMatch(/:free$/);
  });
});
