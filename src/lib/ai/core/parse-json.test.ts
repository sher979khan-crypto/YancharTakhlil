import { describe, expect, it } from "vitest";

import { parseModelJson } from "./parse-json";

const OBJECT = { signal: "HOLD", text: 'a } inside a string and a " quote' };
const JSON_TEXT = JSON.stringify(OBJECT);

describe("parseModelJson", () => {
  it.each([
    ["plain JSON", JSON_TEXT],
    ["surrounding whitespace", `\n  ${JSON_TEXT}  \n`],
    ["a json code fence", "```json\n" + JSON_TEXT + "\n```"],
    ["a bare code fence", "```\n" + JSON_TEXT + "\n```"],
    ["a think block first", `<think>Let me consider {"signal":"BUY"}...</think>\n${JSON_TEXT}`],
    ["a thinking block", `<thinking>hmm</thinking>${JSON_TEXT}`],
    ["text before and after", `Here is the analysis:\n${JSON_TEXT}\nHope this helps!`],
    ["prose with braces before it", `Use the {format} below. ${JSON_TEXT}`],
  ])("finds the object in %s", (_label, content) => {
    expect(parseModelJson(content)).toEqual({ ok: true, value: OBJECT });
  });

  it.each([
    ["empty content", ""],
    ["no object", "I cannot help with that."],
    ["an array", "[1, 2, 3]"],
    ["a truncated object", '{"signal": "HOLD", "reasons": ['],
    ["only an unclosed think block", '<think>{"signal":"BUY"} and then I'],
    ["broken JSON", '{"signal": "HOLD",}'],
  ])("fails on %s", (_label, content) => {
    expect(parseModelJson(content)).toEqual({ ok: false });
  });

  it("does not return a fragment of a broken outer object", () => {
    expect(parseModelJson('{"a": 1,, "inner": {"b": 2}}')).toEqual({ ok: false });
  });
});
