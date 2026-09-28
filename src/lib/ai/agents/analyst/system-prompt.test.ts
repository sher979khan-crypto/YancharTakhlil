import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { aiConfig } from "@/config/ai";

import { ANALYST_SYSTEM_PROMPT_V3, buildSystemPrompt } from "./system-prompt";

describe("ANALYST_SYSTEM_PROMPT_V3", () => {
  it("is the owner-approved text, unchanged (update only with owner approval)", () => {
    const hash = createHash("sha256").update(ANALYST_SYSTEM_PROMPT_V3).digest("hex");
    expect(hash).toBe("c45640b8634aec5f718f7bb90f6e6992236c291caf75387783371982b8726507");
    expect(ANALYST_SYSTEM_PROMPT_V3.length).toBe(3991);
    expect(ANALYST_SYSTEM_PROMPT_V3.startsWith('You are the "AI Analyst" of Yanchar Takhlil')).toBe(
      true,
    );
    expect(
      ANALYST_SYSTEM_PROMPT_V3.endsWith(
        "The JSON keys and the values of signal, confidence and stance stay in English.",
      ),
    ).toBe(true);
  });

  it("uses U+02BB in the Uzbek letters oʻ and gʻ", () => {
    expect(ANALYST_SYSTEM_PROMPT_V3).toContain("oʻ and gʻ");
    expect(ANALYST_SYSTEM_PROMPT_V3).not.toMatch(/[og]'/);
  });

  it("asks for a suggestion to consider, ending the summary with it (v3 changes)", () => {
    expect(ANALYST_SYSTEM_PROMPT_V3).toContain("give ONE educational suggestion to consider");
    expect(ANALYST_SYSTEM_PROMPT_V3).toContain("The LAST sentence of the summary must state");
    expect(ANALYST_SYSTEM_PROMPT_V3).toContain("Maʼlumotlarga koʻra, sotib olishni");
    expect(ANALYST_SYSTEM_PROMPT_V3).not.toContain("recommend");
  });

  it("gives example sentences without digits (the number check stays unaffected)", () => {
    const rule13 = ANALYST_SYSTEM_PROMPT_V3.slice(
      ANALYST_SYSTEM_PROMPT_V3.indexOf("13. ") + "13. ".length,
      ANALYST_SYSTEM_PROMPT_V3.indexOf("14. "),
    );
    expect(rule13).not.toMatch(/\d/);
  });

  it("is version analyst-v3", () => {
    expect(aiConfig.analyst.promptVersion).toBe("analyst-v3");
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
      ANALYST_SYSTEM_PROMPT_V3,
    );
  });
});
