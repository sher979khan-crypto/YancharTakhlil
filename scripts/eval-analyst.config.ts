import { defineConfig } from "vitest/config";

import baseConfig from "../vitest.config";

// The evaluation spends real OpenRouter free-tier quota, so it needs an explicit opt-in.
if (process.env.EVAL_CONFIRM !== "1") {
  throw new Error(
    "eval:analyst makes up to 30 real OpenRouter calls. Run it with EVAL_CONFIRM=1 pnpm eval:analyst.",
  );
}

/**
 * Vitest as a script runner for scripts/eval-analyst.ts: only the app's "@/" and server-only
 * aliases are reused (mergeConfig would also concatenate the unit-test include list).
 */
export default defineConfig({
  resolve: baseConfig.resolve,
  test: {
    environment: "node",
    include: ["scripts/eval-analyst.ts"],
    // Up to 30 calls x (15 s timeout + 3.5 s gap), plus loading the inputs.
    testTimeout: 15 * 60_000,
    reporters: ["verbose"],
  },
});
