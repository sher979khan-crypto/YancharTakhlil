import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { aiConfig } from "@/config/ai";

import { ANALYST_SYSTEM_PROMPT_V2, buildSystemPrompt } from "./system-prompt";

describe("ANALYST_SYSTEM_PROMPT_V2", () => {
  it("is the owner-approved text, unchanged (update only with owner approval)", () => {
    const hash = createHash("sha256").update(ANALYST_SYSTEM_PROMPT_V2).digest("hex");
    expect(hash).toBe("c87ac6fca64635129fe682e8dcd05d0293bc498ed0c24d8d700b3a0c02153ab7");
    expect(ANALYST_SYSTEM_PROMPT_V2.length).toBe(3539);
    expect(ANALYST_SYSTEM_PROMPT_V2.startsWith('You are the "AI Analyst" of Yanchar Takhlil')).toBe(
      true,
    );
    expect(
      ANALYST_SYSTEM_PROMPT_V2.endsWith(
        "The JSON keys and the values of signal, confidence and stance stay in English.",
      ),
    ).toBe(true);
  });

  it("uses U+02BB in the Uzbek letters oʻ and gʻ", () => {
    expect(ANALYST_SYSTEM_PROMPT_V2).toContain("oʻ and gʻ");
    expect(ANALYST_SYSTEM_PROMPT_V2).not.toMatch(/[og]'/);
  });

  it("is version analyst-v2", () => {
    expect(aiConfig.analyst.promptVersion).toBe("analyst-v2");
  });
});

describe("buildSystemPrompt", () => {
  it.each([
    ["en", "Write all text in English."],
    ["ar", "Write all text in Arabic."],
    ["uz", "Write all text in Uzbek (Latin script)."],
  ] as const)("fills the language for %s", (locale, sentence) => {
    const prompt = buildSystemPrompt(locale);
    expect(prompt).toContain(sentence);
    expect(prompt).not.toContain("{language}");
    expect(prompt.replace(sentence, "Write all text in {language}.")).toBe(
      ANALYST_SYSTEM_PROMPT_V2,
    );
  });
});
