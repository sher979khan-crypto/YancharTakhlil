import "server-only";

export type ParseJsonResult = { ok: true; value: unknown } | { ok: false };

const THINK_BLOCK = /<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi;
// An unclosed think tag (the answer was cut off inside it) leaves nothing usable after it.
const OPEN_THINK = /<think(?:ing)?>[\s\S]*$/i;
const CODE_FENCE = /```[a-z]*/gi;

/** End index (inclusive) of the balanced {...} starting at `start`, or -1. Skips strings. */
function objectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Pulls one JSON object out of a model answer whatever the JSON mode: drops <think> blocks and
 * code fences, then parses the first balanced {...}, ignoring any text before or after it. Never
 * throws; the value still has to be validated.
 */
export function parseModelJson(content: string): ParseJsonResult {
  const text = content.replace(THINK_BLOCK, "").replace(OPEN_THINK, "").replace(CODE_FENCE, "");
  let start = text.indexOf("{");
  while (start !== -1) {
    const end = objectEnd(text, start);
    if (end === -1) return { ok: false };
    try {
      const value: unknown = JSON.parse(text.slice(start, end + 1));
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return { ok: true, value };
      }
    } catch {
      // Not JSON (e.g. "{curly} prose"); try the next top-level brace, never a fragment inside.
    }
    start = text.indexOf("{", end + 1);
  }
  return { ok: false };
}
