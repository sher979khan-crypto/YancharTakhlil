import "server-only";

import * as z from "zod";

const optionalValue = z.string().min(1).optional();

export const ServerEnvSchema = z.object({
  MARKET_DATA_PROVIDER: z.enum(["auto", "fixture", "coingecko"]).default("auto"),
  COINGECKO_API_KEY: optionalValue,
  COINGECKO_API_PLAN: z.enum(["demo", "pro"]).default("demo"),
  OPENROUTER_API_KEY_ASSISTANT: optionalValue,
  OPENROUTER_API_KEY_ANALYST: optionalValue,
  OPENROUTER_MODEL_ASSISTANT: optionalValue,
  OPENROUTER_MODEL_ANALYST: optionalValue,
});
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type ServerEnvKey = keyof ServerEnv;

const SERVER_ENV_KEYS = ServerEnvSchema.keyof().options;

export type ServerEnvParseResult = {
  env: ServerEnv;
  /** Variables that were set but invalid and fell back to their default. Names only. */
  invalid: ServerEnvKey[];
};

/**
 * Pure: reads only the given object. Values are trimmed and empty strings count as "not set"
 * (the .env.example template leaves every key empty). Each variable is checked on its own, so one
 * bad value falls back to its default without resetting the others, and nothing ever throws.
 */
export function parseServerEnv(
  source: Readonly<Record<string, string | undefined>>,
): ServerEnvParseResult {
  const input: Partial<Record<ServerEnvKey, string>> = {};
  const invalid: ServerEnvKey[] = [];
  for (const key of SERVER_ENV_KEYS) {
    const value = source[key]?.trim();
    if (!value) continue;
    if (ServerEnvSchema.shape[key].safeParse(value).success) {
      input[key] = value;
    } else {
      invalid.push(key);
    }
  }
  return { env: ServerEnvSchema.parse(input), invalid };
}

/** Names the variables but never their values: a mistyped value may still be a real secret. */
export function formatInvalidEnvWarning(invalid: readonly ServerEnvKey[]): string {
  return `[env] Invalid value for ${invalid.join(", ")}; using the default instead.`;
}

let cached: ServerEnv | undefined;

/** Server environment, parsed once per server process. Logs one warning if anything is invalid. */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    const { env, invalid } = parseServerEnv(process.env);
    if (invalid.length > 0) console.warn(formatInvalidEnvWarning(invalid));
    cached = env;
  }
  return cached;
}
